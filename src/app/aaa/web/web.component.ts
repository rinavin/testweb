import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


@Component({
	selector: "mga-web",
	providers: [TaskMagicService],
	styleUrls: ["./web.component.css"],
	templateUrl: "./web.component.html"
})
export class web extends BaseTaskMagicComponent {}
