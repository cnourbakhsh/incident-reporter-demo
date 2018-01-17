import { Component } from '@angular/core';
import { OnDestroy } from '@angular/core/src/metadata/lifecycle_hooks';
import { Http } from '@angular/http';
import { Platform, AlertController } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/mergeMap';
import { HomePage } from '../pages/home/home';
import { environment } from '../services/environment';
import { ClaimService } from '../services/claims.service';

@Component({
  templateUrl: 'app.html'
})
export class MyApp implements OnDestroy {

  rootPage: any = HomePage;
  notifications: any[] = [];
  notificationsSubcription: Subscription;

  constructor(platform: Platform, statusBar: StatusBar, splashScreen: SplashScreen, private http: Http, private alertCtrl: AlertController, private claimService: ClaimService) {
    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
    });

    this.notificationsSubcription = Observable.interval(3000).flatMap(i => this.http.get((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/notifications/responder')).subscribe(res => {
      if (this.notifications && this.notifications.length !== res.json().length) {
        console.log(res.json().length);
        let notification = res.json().pop();
        console.log(notification);
        let alert = this.alertCtrl.create({
          title: 'Attention',
          subTitle: notification.readableMessage,
          buttons: ['Dismiss']
        });
        alert.present();
      }
      this.notifications = res.json();
    });
  }

  ngOnDestroy(): void {
    this.notificationsSubcription.unsubscribe();
  }
}

