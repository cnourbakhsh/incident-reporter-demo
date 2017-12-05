import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { environment } from '../environments/environment';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class UtilService {

  constructor(private http: HttpClient) { }

  loadVars(processId: string): Observable<Object> {
    const p = new HttpParams();
    return this.http.get(environment.host + environment.imagesUrlChunk + processId);
  }

}
