import { Component, HostListener } from '@angular/core';
import { Architecture } from '@models/simulator/architecture.class';
import { SVGPath } from '@models/simulator/svg/path.class';
import { ArchitectureService } from '@services/simulator/architecture/architecture.service';
import { BusMonitorService } from '@services/simulator/bus-monitor/bus-monitor.service';
import { RequestService } from '@services/simulator/request/request.service';
import { ResponseService } from '@services/simulator/response/response.service';
import { WebsocketService } from '@services/simulator/websocket/websocket.service';
import { TooltipService } from '@services/tooltip/tooltip.service';

@Component({
  selector: 'marinade-simulator',
  styleUrls: ['./simulator-view.component.sass'],
  templateUrl: './simulator-view.component.html',
})
export class SimulatorViewComponent {

  private static readonly DEFAULT_VIEWBOX_HEIGHT: number = 900;
  private static readonly DEFAULT_VIEWBOX_SCALE: number = 1;
  private static readonly DEFAULT_VIEWBOX_UPPER_LEFT_X: number = 0;
  private static readonly DEFAULT_VIEWBOX_UPPER_LEFT_Y: number = 0;
  private static readonly DEFAULT_VIEWBOX_WIDTH: number = 1600;

  private static readonly MAX_SCALE: number = 2.5;
  private static readonly MIN_SCALE: number = 0.75;

  private mouseStartX: number = -1;
  private mouseStartY: number = -1;
  private tracking: boolean = false;
  private viewBoxHeight: number = 900;
  private viewBoxUpperLeftX: number = 0;
  private viewBoxUpperLeftY: number = 0;
  private viewBoxWidth: number = 1600;

  public architecture: Architecture = null;

  public viewBox: string = '0 0 1600 900';
  public viewScale: number = 1;

  constructor(
    private architectureService: ArchitectureService,
    private busMonitorService: BusMonitorService,
    private requestService: RequestService,
    private responseService: ResponseService,
    private tooltipService: TooltipService,
    private websocketService: WebsocketService
  ) {
    this.architectureService.architecture.subscribe((architecture: Architecture) => this.architecture = architecture);
    this.websocketService.connect();
    this.websocketService.messageSubject.subscribe((message: any) => this.responseService.receiveMessage(message));
  }

  private updateViewBox(): void {
    // Bound the architecture on the left
    if (this.viewBoxUpperLeftX < -this.viewBoxWidth * 0.5) {
      this.viewBoxUpperLeftX = -this.viewBoxWidth * 0.5;
    }
    // Bound the architecture on the right
    if (this.viewBoxUpperLeftX / this.viewScale > this.viewBoxWidth) {
      this.viewBoxUpperLeftX = this.viewBoxWidth * (this.viewScale - SimulatorViewComponent.MAX_SCALE);
    }
    // Bound the architecture on the top
    if (this.viewBoxUpperLeftY < -this.viewBoxHeight * 0.5) {
      this.viewBoxUpperLeftY = -this.viewBoxHeight * 0.5;
    }
    // Bound the architecture on the bottom
    if (this.viewBoxUpperLeftY / this.viewScale > this.viewBoxHeight) {
      this.viewBoxUpperLeftY = this.viewBoxHeight * (this.viewScale - SimulatorViewComponent.MAX_SCALE);
    }
    this.viewBox = this.viewBoxUpperLeftX + ' ' + this.viewBoxUpperLeftY + ' ' +
                   this.viewBoxWidth + ' ' + this.viewBoxHeight;
  }

  public load(): void {
    this.architectureService.load();
  }

  /**
   * Start tracking the mouse drag motion
   * @param {MouseEvent} event The MouseEvent that caused the click function to fire
   */
  @HostListener('mousedown', ['$event'])
  public onClick(event: MouseEvent): void {
    // Note the original location of the cursor
    this.mouseStartX = event.x;
    this.mouseStartY = event.y;
    // Allow movements to move the canvas
    this.tracking = true;
  }

  @HostListener('window:keyup', ['$event'])
  public onKeyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case 'i':
        this.requestService.inspect(['']);
        break;
      case 'l':
        this.architectureService.load();
        break;
      case 'p':
        this.architectureService.program();
        break;
      case 'r':
        this.requestService.reset();
        this.architectureService.program();
        this.architectureService.architecture.getValue().path.forEach((path: SVGPath) => {
          path.inspect();
        });
        break;
      case 's':
        this.requestService.step('logic');
        this.architectureService.architecture.getValue().path.forEach((path: SVGPath) => {
          path.inspect();
        });
        break;
      case 'u':
        this.architectureService.unload();
        break;
    }
  }

  /**
   * Pan the canvas based on the direction of the cursor movements
   * @param {MouseEvent} event The MouseEvent that caused the move function to fire
   */
  @HostListener('mousemove', ['$event'])
  public onMove(event: MouseEvent): void {
    // If a click is being held
    if (this.tracking) {
      this.tooltipService.tooltips.forEach((tooltip: any) => {
        tooltip.x.next(tooltip.x.getValue() + (event.x - this.mouseStartX) / this.viewScale);
        tooltip.y.next(tooltip.y.getValue() + (event.y - this.mouseStartY) / this.viewScale);
      });
      // Adjust the top left corner (origin point) based on the location deltas and the viewScale
      this.viewBoxUpperLeftX = this.viewBoxUpperLeftX - (event.x - this.mouseStartX) / this.viewScale;
      this.viewBoxUpperLeftY = this.viewBoxUpperLeftY - (event.y - this.mouseStartY) / this.viewScale;
      // Refresh the viewbox with the new properties
      this.updateViewBox();
      // Create a new reference point for tracking
      this.mouseStartX = event.x;
      this.mouseStartY = event.y;
    }
  }

  /**
   * Stop tracking the mouse drag motion
   */
  @HostListener('mouseup')
  public onRelease(): void {
    // Reset the mouse tracking locations
    this.mouseStartX = 0;
    this.mouseStartY = 0;
    // Prevent movements from moving the canvas
    this.tracking = false;
  }

  /**
   * Scales the viewbox using the mousewheel
   * @param {WheelEvent} event The mousewheel event that called this function
   */
  @HostListener('wheel', ['$event'])
  public onWheel(event: WheelEvent): void {
    // TODO scaling for tooltips
    // Adjust the viewScale
    this.viewScale += event.deltaY / 400;
    if (this.viewScale < SimulatorViewComponent.MIN_SCALE) {
      this.viewScale = SimulatorViewComponent.MIN_SCALE;
    }
    if (this.viewScale > SimulatorViewComponent.MAX_SCALE) {
      this.viewScale = SimulatorViewComponent.MAX_SCALE;
    }
    // Find the old center
    let oldCenterX: number = this.viewBoxWidth / 2;
    let oldCenterY: number = this.viewBoxHeight / 2;
    // Adjust the current height
    this.viewBoxHeight = SimulatorViewComponent.DEFAULT_VIEWBOX_HEIGHT / this.viewScale;
    this.viewBoxWidth = SimulatorViewComponent.DEFAULT_VIEWBOX_WIDTH / this.viewScale;
    // Find the new center
    let centerX: number = this.viewBoxWidth / 2;
    let centerY: number = this.viewBoxHeight / 2;
    // Pan the view so it zooms on the center
    this.viewBoxUpperLeftX += oldCenterX - centerX;
    this.viewBoxUpperLeftY += oldCenterY - centerY;
    this.updateViewBox();
  }

  /**
   * Reset the viewBox to the default view (viewScale 1.0; top-left corner at 0, 0)
   */
  public reset(): void {
    // Reset the height and width properties to remove any zooming
    this.viewBoxHeight = SimulatorViewComponent.DEFAULT_VIEWBOX_HEIGHT;
    this.viewBoxWidth = SimulatorViewComponent.DEFAULT_VIEWBOX_WIDTH;
    // Reset the upper left corner to remove any panning
    this.viewBoxUpperLeftX = SimulatorViewComponent.DEFAULT_VIEWBOX_UPPER_LEFT_X;
    this.viewBoxUpperLeftY = SimulatorViewComponent.DEFAULT_VIEWBOX_UPPER_LEFT_Y;
    // Reset the viewScale used for calculations
    this.viewScale = SimulatorViewComponent.DEFAULT_VIEWBOX_SCALE;
    // Refresh the viewBox with the new properties
    this.updateViewBox();
  }

}
