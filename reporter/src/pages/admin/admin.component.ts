import { Component } from '@angular/core';
import { NavController } from 'ionic-angular/navigation/nav-controller';
import { ClaimService } from '../../services/claims.service';

/**
 * Generated class for the AdminComponent component.
 *
 * See https://angular.io/docs/ts/latest/api/core/index/ComponentMetadata-class.html
 * for more info on Angular Components.
 */
@Component({
  selector: 'admin',
  templateUrl: 'admin.component.html'
})
export class AdminComponent {

  private url: string;

  constructor(private navCtrl: NavController, private claimService: ClaimService) { }

  setURL() {
    if (this.url && this.url.length > 0) {
      this.claimService.mobileBackendURL = this.url;
    }
    this.navCtrl.pop();
  }

}
