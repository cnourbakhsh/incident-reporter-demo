import { Component, OnInit } from '@angular/core';
import { Headers, Http } from '@angular/http';
import { NavController, NavParams } from 'ionic-angular';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { Claim } from '../../objects/Claim';
import { AdjustClaimComponent } from '../adjust-claim/adjust-claim.component';
import { ClaimService } from '../../services/claims.service';
import { environment } from '../../services/environment';

@Component({
  selector: 'claim-details',
  templateUrl: 'claim-details.component.html'
})
export class ClaimDetailsComponent implements OnInit {

  claim: Claim;
  comment: any;

  constructor(private navCtrl: NavController, private navParams: NavParams, private camera: Camera, private http: Http, private claimService: ClaimService) { }

  ngOnInit(): void {
    this.claim = this.navParams.data;
  }

  onBack(): void {
    this.navCtrl.pop();
  }

  saveComment(): void {
    if (this.comment) {
      var newComment = "(A) " + this.comment;
      this.claimService.POST((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/bpms/add-comments/' + this.claim.processId, JSON.stringify({ claimComments: newComment, messageSource: 'responder' })).subscribe((res) => {
        if (!this.claim.incidentComments) {
          this.claim.incidentComments = [];
        }
        this.claim.incidentComments.push(newComment);
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
    let headers = new Headers({ 'Content-Type': 'text/plain' });
    this.http.post((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/bpms/accept-base64-image/' + this.claim.processId + '/' + 'photo-file' + '/responder', base64Image, { headers: headers }).toPromise().then(res => {
      if (res) {
        this.claim.photos.push(res.text());
      }
    }).catch(error => {
      console.error(error);
    });
  }

}