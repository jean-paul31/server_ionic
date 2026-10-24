import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { PlayerPage } from './player.page';
import { VideoService } from '../services/video.service';

describe('PlayerPage', () => {
  let component: PlayerPage;
  let fixture: ComponentFixture<PlayerPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlayerPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) }
        },
        {
          provide: VideoService,
          useValue: {
            createStream: () => of({
              videoUrl: '',
              audioTracks: [],
              subtitleTracks: []
            })
          }
        }
      ]
    });
    fixture = TestBed.createComponent(PlayerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
