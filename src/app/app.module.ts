import {BrowserModule} from "@angular/platform-browser";
import {NgModule} from "@angular/core";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {HttpModule, JsonpModule} from "@angular/http";
import {MagicModule} from "./magic/magic.core.module";
import {AppComponent} from "./app.component";
import {DynamicModule} from "ng-dynamic-component";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {ComponentsList} from "./ComponentList";
import {ThemeModule} from "./magic/src/ui/theme/theme.module";
import {InfiniteScrollModule} from 'ngx-infinite-scroll';
import {CalendarModule} from 'primeng/components/calendar/calendar';
import {MatTableModule, MatPaginatorModule, MatInputModule,  MatDialogModule, MatTooltipModule} from '@angular/material';
import {TextEditDialogComponent} from './magic/src/ui/TextEditDialog/textedit.dialog';
import {RouterModule} from '@angular/router';
import {routes} from './Routes';

const comps = ComponentsList.getAllComponents();

@NgModule({
   declarations: [AppComponent, TextEditDialogComponent, ...comps],
   imports     : [
      BrowserModule,
      FormsModule,
      HttpModule,
      JsonpModule,
      ReactiveFormsModule,
      BrowserAnimationsModule,
      InfiniteScrollModule,
      DynamicModule.withComponents(comps),
      MagicModule.forRoot(),
      CalendarModule,
      MatTableModule,
      MatPaginatorModule,
      MatDialogModule,
      MatInputModule,
      ThemeModule,
      MatTooltipModule,
      RouterModule.forRoot(routes)
   ],
   exports     : [FormsModule, ReactiveFormsModule, InfiniteScrollModule, MatTableModule, MatPaginatorModule],
   providers   : [],

   bootstrap: [AppComponent],
   entryComponents: [ TextEditDialogComponent]
})
export class AppModule
{
   constructor() {}
}
