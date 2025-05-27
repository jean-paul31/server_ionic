from flask import Flask, render_template, url_for, send_from_directory, abort, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Autorise les requêtes depuis Ionic ou autres frontends

# Dossier racine où se trouvent les vidéos
BASE_FOLDER = 'C:/Users/tonto/OneDrive/Documents/Vuze Downloads/'


# Route web avec template HTML (navigateur)
# @app.route('/', defaults={'subpath': ''})
# @app.route('/<path:subpath>')
# def index(subpath):
#     # Calcul du chemin absolu
#     current_path = os.path.abspath(os.path.join(BASE_FOLDER, subpath))

#     # Sécurité : interdit de sortir de BASE_FOLDER
#     if not current_path.startswith(os.path.abspath(BASE_FOLDER)):
#         abort(403)

#     if not os.path.exists(current_path) or not os.path.isdir(current_path):
#         return "Chemin introuvable", 404

#     # Lister les dossiers et vidéos
#     items = os.listdir(current_path)
#     folders = [f for f in items if os.path.isdir(os.path.join(current_path, f))]
#     videos = [f for f in items if os.path.isfile(os.path.join(current_path, f)) and f.lower().endswith(('.mp4', '.avi', '.mkv'))]

    # return render_template('index.html', folders=folders, videos=videos, subpath=subpath)


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

    directory = os.path.dirname(safe_path)
    file = os.path.basename(safe_path)
    return send_from_directory(directory, file)


# Route pour télécharger une vidéo
@app.route('/download/<path:filename>')
def download(filename):
    safe_path = os.path.abspath(os.path.join(BASE_FOLDER, filename))
    if not safe_path.startswith(os.path.abspath(BASE_FOLDER)):
        abort(403)

    directory = os.path.dirname(safe_path)
    file = os.path.basename(safe_path)
    return send_from_directory(directory, file, as_attachment=True)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
