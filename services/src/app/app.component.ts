import { Component } from '@angular/core';
import { OnInit, OnDestroy } from '@angular/core/src/metadata/lifecycle_hooks';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';

import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/timer';

import { UtilService } from './util.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  processId: string;
  containerId: string;
  autoUpdate: boolean;
  accepted: boolean;
  acceptedComments: string;
  comments: string[];
  photos: string[];
  updatedCount: number;
  updateSubscription: Subscription;

  constructor(private http: HttpClient, private utilService: UtilService) {

  }

  ngOnInit() {
    this.processId = '1';
    this.containerId = 'IncidentProcessorContainer';
    this.updatedCount = 0;
    this.autoUpdate = false;

    const updateTimer = Observable.timer(60000, 60000);
    this.updateSubscription = updateTimer.subscribe(() => {
      if (this.autoUpdate) {
        this.update();
      }
    });
  }

  ngOnDestroy() {
    this.updateSubscription.unsubscribe();
  }

  update() {
    let header = new HttpHeaders().set('Authorization', 'Basic cHJvY2Vzc29yOnByb2Nlc3NvciM5OQ==');
    console.log(header);
    let host = 'http://process-server-incident-demo.192.168.99.100.nip.io';
    let containerId = '1776e960572610314f3f813a5dbb736d';
    let processId = '1';
    let url = host + '/kie-server/services/rest/server/containers/' + containerId + '/images/processes/instances/' + processId;
    this.http.get(url, { headers: header }).subscribe(res => {
      console.log(res);
    });
  }

}
