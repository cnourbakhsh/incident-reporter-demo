import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule } from '@angular/http';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { Camera } from '@ionic-native/camera';
import { HTTP } from '@ionic-native/http';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { ExistingClaimsComponent } from '../pages/existing-claims/existing-claims.component';
import { NewClaimComponent } from '../pages/new-claim/new-claim.component';
import { ClaimDetailsComponent } from '../pages/claim-details/claim-details.component';
import { ClaimService } from '../services/claims.service';
import { OrderByPipe } from '../pages/existing-claims/orderBy.pipe';

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    ExistingClaimsComponent,
    NewClaimComponent,
    ClaimDetailsComponent,
    OrderByPipe
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    HttpModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    ExistingClaimsComponent,
    NewClaimComponent,
    ClaimDetailsComponent
  ],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    Camera,
    HTTP,
    ClaimService
  ]
})
export class AppModule { }
