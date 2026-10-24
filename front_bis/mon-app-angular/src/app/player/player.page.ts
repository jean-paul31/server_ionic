import { Component, DestroyRef, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StreamResponse, VideoService } from '../services/video.service';

interface TrackOption {
  index: number;
  label: string;
  language: string;
  url?: string;
}

@Component({
  selector: 'app-player',
  templateUrl: './player.page.html',
  styleUrls: ['./player.page.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class PlayerPage implements OnInit {
  @ViewChild('videoElement', { static: true })
  private videoElement!: ElementRef<HTMLVideoElement>;

  audioTracks: TrackOption[] = [];
  subtitleTracks: TrackOption[] = [];
  selectedAudioTrack = '';
  selectedSubtitleTrack = '-1';
  loading = false;
  errorMessage = '';
  languageChangeMessage = '';

  private filename: string | null = null;
  private videoUrl = '';

  constructor(
    private route: ActivatedRoute,
    private videoService: VideoService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.filename = params.get('file') ?? this.filenameFromLegacyUrl(params.get('url'));
        this.loadStream();
      });
  }

  goBack(): void {
    history.back();
  }

  onAudioTrackChange(event: Event): void {
    const audioIndex = (event.target as HTMLSelectElement).value;
    if (!this.videoUrl || !audioIndex) return;

    const url = new URL(this.videoUrl);
    url.searchParams.set('audio', audioIndex);
    this.videoElement.nativeElement.src = url.toString();
    this.videoElement.nativeElement.load();
    this.selectedAudioTrack = audioIndex;
    this.languageChangeMessage = 'Le changement de langue relance la lecture au début.';
  }

  onSubtitleTrackChange(event: Event): void {
    const selectedIndex = Number((event.target as HTMLSelectElement).value);
    const video = this.videoElement.nativeElement;
    for (let index = 0; index < video.textTracks.length; index += 1) {
      video.textTracks[index].mode = index === selectedIndex ? 'showing' : 'disabled';
    }
    this.selectedSubtitleTrack = String(selectedIndex);
  }

  onVideoError(): void {
    this.loading = false;
    this.errorMessage = 'La vidéo n’a pas pu être lue. Vérifiez que FFmpeg peut décoder ce fichier.';
  }

  private loadStream(): void {
    if (!this.filename) {
      this.errorMessage = 'Aucune vidéo sélectionnée.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.videoService.createStream(this.filename).subscribe({
      next: response => {
        this.applyStream(response);
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(error);
      }
    });
  }

  private applyStream(response: StreamResponse): void {
    this.videoUrl = response.videoUrl;
    this.audioTracks = response.audioTracks.map(track => ({
      ...track,
      label: this.trackLabel(track.label, track.language)
    }));
    this.subtitleTracks = response.subtitleTracks.map(track => ({
      ...track,
      label: this.trackLabel(track.label, track.language)
    }));
    this.selectedAudioTrack = this.audioTracks.length
      ? String(this.audioTracks[0].index)
      : '';
    this.selectedSubtitleTrack = '-1';
    this.videoElement.nativeElement.src = response.videoUrl;
    this.videoElement.nativeElement.load();
  }

  private trackLabel(label: string, language: string): string {
    const subtitlePrefix = 'Sous-titres ';
    const isSubtitleLabel = label.startsWith(subtitlePrefix);
    if (label && label !== language && !(isSubtitleLabel && label.slice(subtitlePrefix.length) === language)) {
      return label;
    }
    if (!language || language === 'und') return label || 'Langue inconnue';

    const displayName = new Intl.DisplayNames(['fr'], { type: 'language' }).of(language);
    return displayName ? `${isSubtitleLabel ? subtitlePrefix : ''}${displayName}` : label;
  }

  private filenameFromLegacyUrl(url: string | null): string | null {
    if (!url) return null;

    try {
      const pathname = new URL(url).pathname;
      return decodeURIComponent(pathname.replace(/^\/videos\//, ''));
    } catch {
      return null;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }
    return 'Impossible de préparer la vidéo.';
  }
}
