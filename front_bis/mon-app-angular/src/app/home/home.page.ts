import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { VideoService, ApiResponse } from '../services/video.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
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
    const videoUrl = `http://192.168.0.10:5000/videos/${this.currentPath ? this.currentPath + '/' : ''}${video}`; //prod
    // const videoUrl = `http://server.local:5000/videos/${this.currentPath ? this.currentPath + '/' : ''}${video}`; //dev 
    this.router.navigate(['/player'], { queryParams: { url: videoUrl } });
  }

  // Optionnel : bouton retour en arrière
  goBack() {
    if (!this.currentPath) return;
    const parts = this.currentPath.split('/');
    parts.pop();
    this.loadList(parts.join('/'));
  }

getThumbnail(video: string): string {
  if (!this.currentPath) return 'assets/default.jpg';

  const parts = this.currentPath.split('/');

  if (parts.length === 1) {
    // 🎬 Films
    const film = parts[0];

    // Cherche un numéro dans le nom de la vidéo (ex: inssaisissable 2.mp4 → 2)
    const match = video.match(/(\d+)/);
    const number = match ? match[1] : '1'; // défaut: 1

    return `assets/thumbnails/${film}/${number}/poster.jpg`;
  }

  if (parts.length >= 2) {
    // 📺 Séries
    const serie = parts[0];
    // Nettoie le nom du dossier de saison (ex: "saison 1" → "S1")
    let saisonRaw = parts[1].toLowerCase().replace(/\s+/g, '').replace('saison', 's');
    if (!saisonRaw.startsWith('s')) {
      saisonRaw = 's' + saisonRaw;
    }

    const saison = saisonRaw.toUpperCase();
    return `assets/thumbnails/${serie}/${saison}/poster.jpg`;
  }

  return 'assets/default.jpg';
}

getVideoTitle(video: string): string {
  // Enlève l'extension .mp4
  let title = video.replace(/\.[^/.]+$/, '');

  // Remplace les underscores et tirets par des espaces
  title = title.replace(/[_-]+/g, ' ');

  // Met une majuscule au début de chaque mot
  title = title.replace(/\b\w/g, (match) => match.toUpperCase());

  return title;
}



}
