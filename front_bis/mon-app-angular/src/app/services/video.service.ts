import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse {
  folders: string[];
  videos: string[];
  subpath: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  // Remplace par l'IP locale de ton PC et port 5000
  private baseUrl = 'http://localhost:5000/api/list'; // dev
  // private baseUrl = 'http://server.local:5000/api/list'; //prod

  constructor(private http: HttpClient) {}

  list(subpath: string = ''): Observable<ApiResponse> {
    const url = subpath ? `${this.baseUrl}/${subpath}` : this.baseUrl;
    return this.http.get<ApiResponse>(url);
  }
}
