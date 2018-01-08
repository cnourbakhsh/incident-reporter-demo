import { Injectable } from '@angular/core';
import { Http, Response, Headers } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';

@Injectable()
export class ClaimService {

    constructor(private http: Http) { }

    GET(url: string): Observable<any> {
        return this.http.get(url)
            .map((response: Response) => <any>response.json())
            .catch(this.handleError);
    }

    POST(url: string, jsonData: string): Observable<any> {
        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        return this.http.post(url, jsonData, { headers: headers })
            .map((response: Response) => <any>response.json())
            .catch(this.handleError);
    }

    PUT(url: string, jsonData: string): Observable<any> {
        return this.http.put(url, jsonData)
            .map((response: Response) => <any>response.json())
            .catch(this.handleError);
    }

    DELETE(url: string): Observable<any> {
        return this.http.delete(url)
            .map((response: Response) => <any>response.json())
            .catch(this.handleError);
    }

    private handleError(error: Response) {
        console.error(error);
        return Observable.throw(error.json().error);
    }
}