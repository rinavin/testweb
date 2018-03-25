
///////////////////////////////////////////////////////////
// class to hold gui-related helper methods
///////////////////////////////////////////////////////////
export class utils {

  ///////////////////////////////////////////////////////////
  // Add magic child control to the supplied array.
  // Recursive, and checks children even if they are not magic controls.
  // Magic controls are controls which have a magic directive attached to them.
  ///////////////////////////////////////////////////////////
  private static addChildren(parent: Element, children: any[], selector: string) {
    for (var i = 0; i < parent.children.length; i++) {
      if (typeof parent.children[i].attributes[selector] !== "undefined") {
        children.push(parent.children[i]);
      }
      this.addChildren(parent.children[i], children, selector);
    }
  }

  ///////////////////////////////////////////////////////////
  // When a click event is on a table, looks for the closest magic control in the
  // table line/cell
  ///////////////////////////////////////////////////////////
  static  lookForClosestMagicControlOnLine(event, selector: string) {
    let clickedControl = event.path[0];
    let minDistChild;
    let children : any[] = [];

    // If it is a container on the table line
    if(clickedControl.getAttribute('magicMark') === "magicTableRowContainer") {
      // get an array of magic children
      this.addChildren(clickedControl, children, selector);

      let minDist = 0xffffff;

      // loop over children, measure their distance and keep the one with the smallest distance
      for (var i = 0; i < children.length; i++) {
        let child = children[i];
        let dist = this.getDistance(child, clickedControl.screenX, clickedControl.screenY);
        if(dist < minDist) {
          minDist = dist;
          minDistChild = child;
        }
      }
    }
    return minDistChild;
  }

  ///////////////////////////////////////////////////////////
  // Calculate the distance between the control and the supplied x,y coordinates
  ///////////////////////////////////////////////////////////
  static getDistance(control: Element, x: number, y: number): number {

    let left = control.clientLeft, top = control.clientTop;

    let dx, dy: number;
    const right = left + control.clientWidth;
    const bottom = top + control.clientHeight;

    if (x < left) {
      dx = left - x;
    } else if (x > right) {
      dx = x - right;
    } else {
      dx = 0;
    }

    if (y < top) {
      dy = top - y;
    } else if (y > bottom) {
      dy = y - bottom;
    } else {
      dy = 0;
    }
    const ret = (dx * dx + dy * dy)
    return ret;
  }

  ///////////////////////////////////////////////////////////
  //
  ///////////////////////////////////////////////////////////
  static getDimentions(el) {
    let xPos = 0;
    let yPos = 0;
    let width = el.width;
    let height = el.height;

    while (el) {
      if (el.tagName == "BODY") {
        // deal with browser quirks with body/window/document and page scroll
        let xScroll = el.scrollLeft || document.documentElement.scrollLeft;
        let yScroll = el.scrollTop || document.documentElement.scrollTop;

        xPos += (el.offsetLeft - xScroll + el.clientLeft);
        yPos += (el.offsetTop - yScroll + el.clientTop);
      } else {
        // for all other non-BODY elements
        xPos += (el.offsetLeft - el.scrollLeft + el.clientLeft);
        yPos += (el.offsetTop - el.scrollTop + el.clientTop);
      }

      el = el.offsetParent;

    }
    return {
      x: xPos,
      y: yPos,
      width: width,
      height: height
    };
  }

}
