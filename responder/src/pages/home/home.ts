import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ExistingClaimsComponent } from '../existing-claims/existing-claims.component'

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(private navCtrl: NavController) { }

  onGetStarted(): void {
    this.navCtrl.push(ExistingClaimsComponent);
  }

}
