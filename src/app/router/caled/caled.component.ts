import { Component } from "@angular/core";

import { BaseTaskMagicComponent } from "../../magic/src/ui/app.baseMagicComponent";

import { TaskMagicService } from "../../magic/src/services/task.magics.service";

export namespace router_caled_caled {
	@Component({
		selector: "mga-caled",
		providers: [TaskMagicService],
		styleUrls: ["./caled.component.css"],
		templateUrl: "./caled.component.html"
	})
	export class caled extends BaseTaskMagicComponent {}
}