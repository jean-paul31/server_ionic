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

  const parts = this.currentPath.split('/').filter(p => p.length > 0);
  const root = parts[0];
  console.log(root);
  

  // 🎬 Cas des FILMS (Dossier racine uniquement)
  if (parts.length === 1) {
    // On cherche un chiffre isolé (ex: "Film 2.mp4") ou on prend 1 par défaut
    const match = video.match(/(?:^|\s)(\d+)(?:\.|\s|$)/);
    const number = match ? match[1] : '1';

    return `assets/thumbnails/${root}/${number}/poster.jpg`;
  } else  if (parts.length >= 2) { 
    // const seasonFolder = parts[1];
    // On extrait uniquement les chiffres pour reconstruire le format "SX"
    const seasonMatch = parts[1].match(/\d+/);
    const seasonTag = `S${seasonMatch ? seasonMatch[0] : '1'}`;

    return `assets/thumbnails/${root}/${seasonTag}/poster.jpg`;
  } else {
    return 'assets/default.jpg';
  }

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
