import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ExistingClaimsComponent } from '../existing-claims/existing-claims.component'
import { AdminComponent } from '../admin/admin.component';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  constructor(private navCtrl: NavController) { }

  onGetStarted(): void {
    this.navCtrl.push(ExistingClaimsComponent);
  }

  onAdmin(): void {
    this.navCtrl.push(AdminComponent);
  }

}
