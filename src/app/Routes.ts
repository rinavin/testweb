import {Routes} from '@angular/router';
import {MagicRouterContainer} from './magic/src/ui/MagicRouterContainer';

export const routes: Routes = [
  {
    path: 'A',
    component: MagicRouterContainer
  },
  {
    path: 'A',
    component: MagicRouterContainer,
    outlet: "Subform3"
  },
  {
    path: 'B',
    component: MagicRouterContainer,
  }];

