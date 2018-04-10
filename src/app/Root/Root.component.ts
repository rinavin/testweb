import { Component } from "@angular/core";

import { BaseTaskMagicComponent } from "../magic/src/ui/app.baseMagicComponent";

import { TaskMagicService } from "../magic/src/services/task.magics.service";

export namespace Root_Root {
	@Component({
		selector: "mga-Root",
		providers: [TaskMagicService],
		styleUrls: ["./Root.component.css"],
		templateUrl: "./Root.component.html"
	})
	export class Root extends BaseTaskMagicComponent {}
}
