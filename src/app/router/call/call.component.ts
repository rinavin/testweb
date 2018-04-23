import { Component } from "@angular/core";

import { BaseTaskMagicComponent } from "../../magic/src/ui/app.baseMagicComponent";

import { TaskMagicService } from "../../magic/src/services/task.magics.service";

@Component({
	selector: "mga-call",
	providers: [TaskMagicService],
	styleUrls: ["./call.component.css"],
	templateUrl: "./call.component.html"
})
export class call extends BaseTaskMagicComponent {}
