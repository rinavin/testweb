import { Component } from "@angular/core";

import { BaseTaskMagicComponent } from "../magic/src/ui/app.baseMagicComponent";

import { TaskMagicService } from "../magic/src/services/task.magics.service";

import {
	MatPaginator,
	MatSort,
	MatTableDataSource,
	MatDialog
} from "@angular/material";
import { SelectionModel } from "@angular/cdk/collections";
import { ViewChild } from "@angular/core";
import { ChangeDetectorRef } from "@angular/core";
import { Router } from "@angular/router";

export namespace WebClientaa_WebClientaa {
	@Component({
		selector: "mga-WebClientaa",
		providers: [TaskMagicService],
		styleUrls: ["./WebClientaa.component.css"],
		templateUrl: "./WebClientaa.component.html"
	})
	export class WebClientaa extends BaseTaskMagicComponent {
		@ViewChild(MatPaginator) paginator: MatPaginator;
		@ViewChild(MatSort) sort: MatSort;
		displayedColumns = ["a", "b", "log"];
		constructor(
			public dialog: MatDialog,
			protected ref: ChangeDetectorRef,
			protected task: TaskMagicService,
			protected router: Router
		) {
			super(ref, task, router);
		}
		dataSource = new MatTableDataSource<Element>(this.task.Records.list);
		selection = new SelectionModel<Element>(false, []);

		refreshDataSource() {
			this.dataSource.data = this.task.Records.list;
			this.dataSource.paginator = this.paginator;
		}

		getPageSize(): number {
			return this.paginator.pageSize;
		}

		selectRow(rowId: string): void {
			this.selection.select(this.task.Records.list[rowId]);
		}

		GetDialog(): any {
			return this.dialog;
		}
	}
}
