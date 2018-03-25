import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

@Component({
  selector: 'app-textedit-dialog',
  templateUrl: 'textedit.dialog.html',
  styleUrls: ['./textedit.dialog.css'],

})
export class TextEditDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<TextEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  onEnter(val) {
    this.dialogRef.close(this.data.text);
  }

}


/**  Copyright 2018 Google Inc. All Rights Reserved.
 Use of this source code is governed by an MIT-style license that
 can be found in the LICENSE file at http://angular.io/license */
