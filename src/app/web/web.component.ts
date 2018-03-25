import { Component } from "@angular/core";
import { BaseTaskMagicComponent } from "../magic/src/ui/app.baseMagicComponent";
import { TaskMagicService } from "../magic/src/services/task.magics.service";

export namespace web_web {
	@Component({
		selector: "mga-web",
		providers: [TaskMagicService],
		styleUrls: ["./web.component.css"],
		templateUrl: "./web.component.html"
	})
	export class web extends BaseTaskMagicComponent {}
}
