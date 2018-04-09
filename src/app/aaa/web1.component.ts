import { Component } from "@angular/core";

import { BaseTaskMagicComponent } from "../magic/src/ui/app.baseMagicComponent";

import { TaskMagicService } from "../magic/src/services/task.magics.service";

export namespace aaa_web1 {
	@Component({
		selector: "mga-web1",
		providers: [TaskMagicService],
		styleUrls: ["./web1.component.css"],
		templateUrl: "./web1.component.html"
	})
	export class web1 extends BaseTaskMagicComponent {}
}
