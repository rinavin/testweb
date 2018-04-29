import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HttpModule, JsonpModule} from '@angular/http';
import {AppComponent} from './app.component';
import {DynamicModule} from 'ng-dynamic-component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ComponentArray, compHash, title} from './component-list.g';
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {CalendarModule} from 'primeng/components/calendar/calendar';
import {MatDialogModule, MatInputModule, MatPaginatorModule, MatTableModule, MatTooltipModule} from '@angular/material';
import {RouterModule} from '@angular/router';
import {routes} from './Routes';
import {MagicModule,ComponentListService} from '@magic/angular';
import {MagicAngularMaterialModule} from '@magic/angular-material-core';


@NgModule({
  declarations: [AppComponent, ...ComponentArray],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,

    ReactiveFormsModule,
    FormsModule,
    RouterModule.forRoot(routes),
    HttpModule,
    JsonpModule,

    InfiniteScrollModule,
    DynamicModule.withComponents(ComponentArray),

    MagicModule.forRoot(),
    MagicAngularMaterialModule,

    CalendarModule,

    MatTooltipModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatInputModule,
    //ThemeModule,


  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(componentList:ComponentListService) {
    componentList.addComponents(compHash);
    componentList.title = title;
  }

}
