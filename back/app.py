from flask import Flask, render_template, url_for, send_file, abort, jsonify
from flask_cors import CORS
import json
import math
import os
import shutil
import subprocess
import threading
import mimetypes

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/videos/*": {"origins": "*"}})

# Autorise les requêtes depuis Ionic ou autres frontends

# Dossier racine où se trouvent les vidéos
BASE_FOLDER = "/mnt/stockage/films/"
FFMPEG_BINARY = os.environ.get('FFMPEG_BINARY', 'ffmpeg')
FFPROBE_BINARY = os.environ.get('FFPROBE_BINARY', 'ffprobe')


def resolve_video_path(filename):
    root = os.path.realpath(BASE_FOLDER)
    path = os.path.realpath(os.path.join(root, filename))
    try:
        if os.path.commonpath([root, path]) != root:
            abort(403)
    except ValueError:
        abort(403)
    if not os.path.isfile(path):
        abort(404)
    return path


def probe_video(video_path):
    probe_result = subprocess.run(
        [
            FFPROBE_BINARY, '-v', 'error', '-show_streams',
            '-of', 'json', video_path
        ],
        check=True,
        capture_output=True,
        text=True
    )
    return json.loads(probe_result.stdout).get('streams', [])


def get_text_subtitle_streams(streams):
    text_codecs = {'ass', 'ssa', 'subrip', 'webvtt', 'mov_text', 'text'}
    return [
        stream for stream in streams
        if stream.get('codec_type') == 'subtitle' and stream.get('codec_name') in text_codecs
    ]


def get_track_label(stream, prefix=''):
    tags = stream.get('tags') or {}
    language = tags.get('language') or 'und'
    return {
        'language': language,
        'label': tags.get('title') or f'{prefix}{language}'
    }


def stream_process_output(process, description):
    stderr_output = bytearray()

    def collect_stderr():
        if process.stderr is None:
            return
        for chunk in iter(lambda: process.stderr.read(8192), b''):
            stderr_output.extend(chunk)
            if len(stderr_output) > 65536:
                del stderr_output[:-65536]

    stderr_thread = threading.Thread(target=collect_stderr, daemon=True)
    stderr_thread.start()

    try:
        if process.stdout is None:
            raise RuntimeError('FFmpeg output stream was not opened')
        for chunk in iter(lambda: process.stdout.read(65536), b''):
            yield chunk
        return_code = process.wait()
        stderr_thread.join()
        if return_code:
            app.logger.error(
                '%s failed with exit code %s: %s',
                description,
                return_code,
                stderr_output.decode('utf-8', errors='replace')
            )
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        stderr_thread.join(timeout=1)


def create_ffmpeg_response(command, mimetype, description):
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    except OSError:
        app.logger.exception('Unable to start FFmpeg for %s', description)
        return jsonify({'error': 'Impossible de démarrer FFmpeg pour cette vidéo.'}), 503

    response = Response(
        stream_process_output(process, description),
        mimetype=mimetype,
        direct_passthrough=True
    )
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Accel-Buffering'] = 'no'
    return response


@app.route('/api/stream', methods=['POST'])
def create_stream():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({'error': 'Le corps de la requête doit contenir le chemin de la vidéo.'}), 400
    filename = payload.get('filename')
    if not isinstance(filename, str) or not filename:
        return jsonify({'error': 'Le chemin de la vidéo est requis.'}), 400

    video_path = resolve_video_path(filename)
    if not shutil.which(FFMPEG_BINARY) or not shutil.which(FFPROBE_BINARY):
        return jsonify({
            'error': 'FFmpeg et FFprobe doivent être installés et accessibles dans le PATH.'
        }), 503

    try:
        streams = probe_video(video_path)
    except subprocess.CalledProcessError as error:
        app.logger.error('FFprobe failed: %s', error.stderr)
        return jsonify({'error': 'Impossible de lire les pistes de cette vidéo.'}), 422
    except (OSError, json.JSONDecodeError):
        app.logger.exception('Unable to inspect video streams')
        return jsonify({'error': 'Impossible de lire les pistes de cette vidéo.'}), 422

    video_streams = [stream for stream in streams if stream.get('codec_type') == 'video']
    audio_streams = [stream for stream in streams if stream.get('codec_type') == 'audio']
    if not video_streams:
        return jsonify({'error': 'La vidéo ne contient aucune piste vidéo.'}), 422

    return jsonify({
        'videoUrl': url_for(
            'video_stream', filename=filename,
            audio=audio_streams[0]['index'] if audio_streams else -1,
            _external=True
        ),
        'audioTracks': [
            {
                'index': stream['index'],
                **get_track_label(stream)
            }
            for stream in audio_streams
        ],
        'subtitleTracks': [
            {
                'index': stream['index'],
                'url': url_for(
                    'subtitle_stream',
                    filename=filename,
                    stream=stream['index'],
                    _external=True
                ),
                **get_track_label(stream, 'Sous-titres ')
            }
            for stream in get_text_subtitle_streams(streams)
        ],
    })


@app.route('/videos/stream/<path:filename>')
def video_stream(filename):
    video_path = resolve_video_path(filename)
    try:
        streams = probe_video(video_path)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError):
        app.logger.exception('Unable to inspect video for streaming')
        return jsonify({'error': 'Impossible de préparer cette vidéo.'}), 422

    video_streams = [stream for stream in streams if stream.get('codec_type') == 'video']
    audio_streams = [stream for stream in streams if stream.get('codec_type') == 'audio']
    if not video_streams:
        return jsonify({'error': 'La vidéo ne contient aucune piste vidéo.'}), 422

    audio_index = request.args.get('audio', type=int)
    audio_stream = next(
        (stream for stream in audio_streams if stream['index'] == audio_index),
        None
    )
    if audio_index is not None and audio_index >= 0 and audio_stream is None:
        return jsonify({'error': 'La piste audio demandée est introuvable.'}), 400

    try:
        start_time = float(request.args.get('start', '0'))
    except ValueError:
        return jsonify({'error': 'La position de lecture est invalide.'}), 400
    if not math.isfinite(start_time) or start_time < 0:
        return jsonify({'error': 'La position de lecture est invalide.'}), 400

    command = [FFMPEG_BINARY, '-hide_banner', '-loglevel', 'error', '-nostdin']
    if start_time:
        command.extend(['-ss', str(start_time)])
    command.extend(['-i', video_path, '-map', f"0:{video_streams[0]['index']}"])
    if audio_stream:
        command.extend(['-map', f"0:{audio_stream['index']}"])
    command.extend([
        '-sn', '-dn', '-c:v', 'libx264', '-preset', 'veryfast',
        '-crf', '23', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        '-f', 'mp4', 'pipe:1'
    ])
    return create_ffmpeg_response(command, 'video/mp4', video_path)


@app.route('/videos/subtitles/<path:filename>')
def subtitle_stream(filename):
    video_path = resolve_video_path(filename)
    try:
        streams = probe_video(video_path)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError):
        app.logger.exception('Unable to inspect video subtitles')
        return jsonify({'error': 'Impossible de lire les sous-titres de cette vidéo.'}), 422

    subtitle_index = request.args.get('stream', type=int)
    subtitle_stream = next(
        (
            stream for stream in get_text_subtitle_streams(streams)
            if stream['index'] == subtitle_index
        ),
        None
    )
    if subtitle_stream is None:
        return jsonify({'error': 'La piste de sous-titres est introuvable ou incompatible.'}), 404

    command = [
        FFMPEG_BINARY, '-hide_banner', '-loglevel', 'error', '-nostdin',
        '-i', video_path, '-map', f"0:{subtitle_stream['index']}",
        '-f', 'webvtt', 'pipe:1'
    ]
    return create_ffmpeg_response(command, 'text/vtt', f'{video_path} subtitles')



# Route API pour frontend (Ionic ou autre)
@app.route('/api/list', defaults={'subpath': ''})
@app.route('/api/list/<path:subpath>')
def api_list(subpath):
    # Calcul du chemin absolu
    current_path = os.path.abspath(os.path.join(BASE_FOLDER, subpath))

    # Sécurité : interdit de sortir de BASE_FOLDER
    if not current_path.startswith(os.path.abspath(BASE_FOLDER)):
        return jsonify({"error": "Accès interdit"}), 403

    if not os.path.exists(current_path) or not os.path.isdir(current_path):
        return jsonify({"error": "Chemin introuvable"}), 404

    # Lister les dossiers et vidéos
    items = os.listdir(current_path)
    folders = [f for f in items if os.path.isdir(os.path.join(current_path, f))]
    videos = [f for f in items if os.path.isfile(os.path.join(current_path, f)) and f.lower().endswith(('.mp4', '.avi', '.mkv'))]

    return jsonify({
        "folders": folders,
        "videos": videos,
        "subpath": subpath
    })


# Route pour lire une vidéo
@app.route('/videos/<path:filename>')
def videos(filename):
    safe_path = os.path.abspath(os.path.join(BASE_FOLDER, filename))

    if not safe_path.startswith(os.path.abspath(BASE_FOLDER)):
        abort(403)

    if not os.path.exists(safe_path):
        abort(404)

    mime_type, _ = mimetypes.guess_type(safe_path)

    return send_file(
        safe_path,
        mimetype=mime_type,
        conditional=True
    )


# Route pour télécharger une vidéo
@app.route('/download/<path:filename>')
def download(filename):
    safe_path = resolve_video_path(filename)
    directory = os.path.dirname(safe_path)
    file = os.path.basename(safe_path)
    return send_from_directory(directory, file, as_attachment=True)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
