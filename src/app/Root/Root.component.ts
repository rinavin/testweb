import { Component } from "@angular/core";

import { BaseTaskMagicComponent,TaskMagicService } from "@magic/angular";


export namespace Root_Root {
	@Component({
		selector: "mga-Root",
		providers: [TaskMagicService],
		styleUrls: ["./Root.component.css"],
		templateUrl: "./Root.component.html"
	})
	export class Root extends BaseTaskMagicComponent {}
}
