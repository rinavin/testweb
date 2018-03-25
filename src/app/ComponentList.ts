import { ComponentListBase } from "./ComponentListBase";
import { Component } from "@angular/core";

import { web_web } from "./web/web.component";

import { aaa_web1 } from "./aaa/web1.component";

import { checkbox_checkbox } from "./checkbox/checkbox.component";

export class ComponentsList extends ComponentListBase {
	static compHash: { [x: string]: any } = {
		web_web: web_web.web,

		aaa_web1: aaa_web1.web1,

		checkbox_checkbox: checkbox_checkbox.checkbox
	};

	static ComponentArray: any[] = [
		web_web.web,

		aaa_web1.web1,

		checkbox_checkbox.checkbox
	];

	static getArray() {
		return this.ComponentArray;
	}

	public getComponents(name: string): Component {
		return ComponentsList.compHash[name];
	}

	public static getAllComponents() {
		return this.ComponentArray;
	}

	public getTitle(): string {
		return "testweb";
	}
}
