import {ChangeDetectorRef, Component} from '@angular/core';

import { BaseTaskMagicComponent,TaskMagicService,ComponentListService } from "@magic/angular";
import {ActivatedRoute, Router} from '@angular/router';

@Component({
	selector: "mga-web1",
	providers: [TaskMagicService],
	styleUrls: ["./web1.component.css"],
	templateUrl: "./web1.component.html"
})
export class web1 extends BaseTaskMagicComponent {

  constructor( ref: ChangeDetectorRef,
               task: TaskMagicService,
               router     : Router,
               activatedRoute: ActivatedRoute,
               componentList:ComponentListService) {
   super(ref,task, router ,activatedRoute,componentList);
  }

}
