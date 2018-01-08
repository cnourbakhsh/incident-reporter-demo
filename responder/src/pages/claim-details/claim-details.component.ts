import { Component, OnInit } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { HTTP } from '@ionic-native/http';
import { Claim } from '../../objects/Claim';
import { AdjustClaimComponent } from '../adjust-claim/adjust-claim.component';
import { ClaimService } from '../../services/claims.service';
import { environment } from '../../services/environment';

@Component({
  selector: 'existing-claims',
  templateUrl: 'claim-details.component.html'
})
export class ClaimDetailsComponent implements OnInit {

  claim: Claim;
  comment: any;

  constructor(private navCtrl: NavController, private navParams: NavParams, private camera: Camera, private http: HTTP, private claimService: ClaimService) { }

  ngOnInit(): void {
    this.claim = this.navParams.data;
  }

  onBack(): void {
    this.navCtrl.pop();
  }

  saveComment(): void {
    if (this.comment) {
      this.claimService.POST(environment.mobileBackendUrl + '/api/v1/bpms/add-comments/' + this.claim.processId, JSON.stringify({ claimComments: this.comment, messageSource: 'responder' })).subscribe((res) => {
        if (!this.claim.incidentComments) {
          this.claim.incidentComments = [];
        }
        this.claim.incidentComments.push(this.comment);
        this.comment = '';
      });
    }
  }

  onCloseTicket(): void {
    this.navCtrl.push(AdjustClaimComponent, this.claim);
  }

  takePhoto(pictureSourceId: number): void {
    const options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      correctOrientation: true,
      sourceType: pictureSourceId
    };

    this.camera.getPicture(options).then((imageData) => {
      let base64Image = 'data:image/jpeg;base64,' + imageData;
      this.uploadBase64Image(base64Image);
      this.camera.cleanup();
    }, (error) => {
      console.error(error);
      this.camera.cleanup();
    });

  }

  private uploadBase64Image(base64Image: string): void {
    this.http.post(environment.mobileBackendUrl + '/api/v1/bpms/accept-base64-image/' + this.claim.processId + '/' + 'test_file' + '/reporter', base64Image, { 'content-type': 'text/plain' }).then(res => {
      console.log(res);
    }).catch(error => {
      console.error(error);
    });
  }

}