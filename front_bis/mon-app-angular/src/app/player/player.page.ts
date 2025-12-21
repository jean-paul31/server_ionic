import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player',
  templateUrl: './player.page.html',
  styleUrls: ['./player.page.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class PlayerPage implements OnInit {
  videoUrl: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.videoUrl = params.get('url');
    });
  }

  goBack() {
    history.back(); // Retour à la page précédente
  }
}
