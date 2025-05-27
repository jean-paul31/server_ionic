import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { VideoService, ApiResponse } from '../services/video.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonicModule,
    CommonModule
  ],
})
export class HomePage implements OnInit {

  folders: string[] = [];
  videos: string[] = [];
  currentPath: string = '';

  constructor(private videoService: VideoService, private router: Router) {}

  ngOnInit() {
    this.loadList();
  }

  loadList(subpath: string = '') {
    this.videoService.list(subpath).subscribe({
      next: (res: ApiResponse) => {
        this.folders = res.folders;
        this.videos = res.videos;
        this.currentPath = res.subpath;
      },
      error: err => {
        console.error('Erreur API', err);
        alert('Erreur de récupération des données');
      }
    });
  }

  onFolderClick(folder: string) {
    const newPath = this.currentPath ? `${this.currentPath}/${folder}` : folder;
    this.loadList(newPath);
  }

onVideoClick(video: string) {
  const videoUrl = `http://192.168.0.31:5000/videos/${this.currentPath ? this.currentPath + '/' : ''}${video}`;
  this.router.navigate(['/player'], { queryParams: { url: videoUrl } });
}

  // Optionnel : bouton retour en arrière
  goBack() {
    if (!this.currentPath) return;
    const parts = this.currentPath.split('/');
    parts.pop();
    this.loadList(parts.join('/'));
  }
}
