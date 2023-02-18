# Architectural walk-through

## Task 1. Moving around an environment

Update constraints for moving between `PROXY` surfaces
```JavaScript
        //cast left
        dir.set(-1,0,0);
        dir.applyMatrix4(this.dolly.matrix);
        dir.normalize();
        this.raycaster.set(pos, dir);

        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            if (intersect[0].distance<wallLimit) this.dolly.translateX(wallLimit-intersect[0].distance);
        }

        //cast right
        dir.set(1,0,0);
        dir.applyMatrix4(this.dolly.matrix);
        dir.normalize();
        this.raycaster.set(pos, dir);

        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            if (intersect[0].distance<wallLimit) this.dolly.translateX(intersect[0].distance-wallLimit);
        }

        //cast down
        dir.set(0,-1,0);
        pos.y += 1.5;
        this.raycaster.set(pos, dir);

        intersect = this.raycaster.intersectObject(this.proxy);
        if (intersect.length>0){
            this.dolly.position.copy( intersect[0].point );
        }
```
Task 2. Info board

* Create JSON file with text for info boards
```JSON
{
  "Atrium_Table_1": {
    "name": "Atrium",
    "info": "Students can meet in small groups in the Atrium for informal sessions."
  },
  "Kitchen_Worktop_Hobs__1_": {
    "name": "Kitchen",
    "info": "The kitchen has a level 5 hygiene rating."
  }
}
```
* Load JSON file
```JavaScript
import collegeInfo from "../assets/college.json"
```
* Prepare functions for displaying the information board
```JavaScript
   createUI() {
        const config = {
            panelSize: { height: 0.5 },
            height: 256,
            name: { fontSize: 50, height: 70 },
            info: { position:{ top: 70 }, backgroundColor: "#ccc", fontColor:"#000" }
        };
        
        const content = {
            name: "name",
            info: "info"
        };
        
        this.ui = new CanvasUI( content, config );
        this.scene.add( this.ui.mesh );
    }
    
    showInfoBoard( name, obj, pos ) {
        if (this.ui === undefined ) return;
        this.ui.position.copy(pos).add( this.workingVec3.set( 0, 1.3, 0 ) );
        const camPos = this.dummyCam.getWorldPosition( this.workingVec3 );
        this.ui.updateElement( 'name', obj.name );
        this.ui.updateElement( 'info', obj.info );
        this.ui.update();
        this.ui.lookAt( camPos )
        this.ui.visible = true;
        this.boardShown = name;
    }
```
* Update renderer for checking if the user gets 3 meters closer to the object.
```JSON
        if (this.renderer.xr.isPresenting && this.boardData) {
            const scene = this.scene;
            const dollyPos = this.dolly.getWorldPosition(this.vecDolly);
            let boardFound = false;
            Object.entries(this.boardData).forEach(([name, info]) => {
                const obj = scene.getObjectByName(name)
                if (obj !== undefined) {
                    const pos = obj.getWorldPosition(this.vecObject)
                    if (dollyPos.distanceTo(pos) < 3) {
                        boardFound = true;
                        if (this.boardShown !== name) this.showInfoboard(name, info, pos)
                    }
                }
            })
            if (!boardFound) {
                this.boardShown = ''
                this.ui.visible = false
            }
        }
```

## Task 3. Add movement on vertically static position with gaze detection

1. Initialized gaze if missed grip controller

![](/docs/task3.1.png)
2. Add event listener for `connected` event

![](/docs/task3.2.png)
3. Move if gaze controller detect static position

![](/docs/task3.3.png)