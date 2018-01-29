import { Component } from '@angular/core';
import { OnInit } from '@angular/core/src/metadata/lifecycle_hooks';
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
export class AdminComponent implements OnInit {

  private url: string;

  constructor(private navCtrl: NavController, private claimService: ClaimService) { }

  ngOnInit(): void {
    if (this.claimService.mobileBackendURL && this.claimService.mobileBackendURL.length > 0) {
      this.url = this.claimService.mobileBackendURL;
    }
  }

  setURL() {
    if (this.url && this.url.length > 0) {
      this.claimService.mobileBackendURL = this.url;
    }
    this.navCtrl.pop();
  }

  goBack() {
    if (this.navCtrl.canGoBack()) {
      this.navCtrl.pop();
    }
  }

}
