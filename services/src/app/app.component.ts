import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  processId: string;
  containerId: string;
  doAutoUpdate: boolean;
  isAccepted: boolean;
  acceptedComments: string;
}
