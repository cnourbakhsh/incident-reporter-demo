import { Component, OnInit } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { Headers, Http } from '@angular/http';
import 'rxjs/add/operator/toPromise';
import { Claim } from '../../objects/Claim';
import { ClaimService } from '../../services/claims.service';
import { environment } from '../../services/environment';

@Component({
  selector: 'claim-details',
  templateUrl: 'claim-details.component.html'
})
export class ClaimDetailsComponent implements OnInit {

  claim: Claim;
  comment: string;
  feedback: string;

  constructor(private navCtrl: NavController, private navParams: NavParams, private http: Http, private camera: Camera, private claimService: ClaimService) { }

  ngOnInit(): void {
    this.claim = this.navParams.data;
    console.log(this.claim);
  }

  onBack(): void {
    this.navCtrl.pop();
  }

  saveComment(): void {
    if (this.comment) {
      var newComment = "(C) " + this.comment;
      this.claimService.POST((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/bpms/add-comments/' + this.claim.processId, JSON.stringify({ claimComments: newComment, messageSource: 'reporter' })).subscribe((res) => {
        if (!this.claim.incidentComments) {
          this.claim.incidentComments = [];
        }
        this.claim.incidentComments.push(newComment);
        this.comment = '';
      });
    }
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
    this.http.post((this.claimService.mobileBackendURL ? this.claimService.mobileBackendURL : environment.mobileBackendUrl) + '/api/v1/bpms/accept-base64-image/' + this.claim.processId + '/' + 'photo-file' + '/reporter', base64Image, { headers: headers }).toPromise().then(res => {
      if (res) {
        this.claim.photos.push(res.text());
      }
    }).catch(error => {
      console.error(error);
    });
  }

}