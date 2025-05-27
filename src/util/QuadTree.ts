/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2014 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */

/**
 * Javascript QuadTree
 * @version 1.0
 * @author Timo Hausmann
 *
 * @version 1.2, September 4th 2013
 * @author Richard Davey
 * The original code was a conversion of the Java code posted to GameDevTuts. However I've tweaked
 * it massively to add node indexing, removed lots of temp. var creation and significantly
 * increased performance as a result.
 *
 * Original version at https://github.com/timohausmann/quadtree-js/
 */

/**
 * @copyright © 2012 Timo Hausmann
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
  subWidth: number;
  subHeight: number;
  right: number;
  bottom: number;
}

export interface PositionedObject {
  x: number;
  y: number;
  right: number;
  bottom: number;
  quadTreeIndex?: number;
  gameObject?: any;
}

interface Sprite {
  body: PositionedObject;
  alive: boolean;
}

interface Group {
  forEach(callback: (sprite: Sprite) => void, context: any, checkExists?: boolean): void;
}

export class QuadTree {
  private maxObjects: number;
  private maxLevels: number;
  private level: number;
  private bounds: Bounds;
  private objects: PositionedObject[];
  private nodes: QuadTree[];

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    maxObjects: number = 10,
    maxLevels: number = 4,
    level: number = 0
  ) {
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;

    this.bounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: width,
      height: height,
      subWidth: Math.floor(width / 2),
      subHeight: Math.floor(height / 2),
      right: Math.round(x) + width,
      bottom: Math.round(y) + height,
    };

    this.objects = [];
    this.nodes = [];
  }

  /**
   * Populates this quadtree with the members of the given Group.
   */
  public populate(group: Group): void {
    group.forEach(this.populateHandler, this, true);
  }

  /**
   * Handler for the populate method.
   */
  private populateHandler(sprite: Sprite): void {
    if (sprite.body && sprite.alive) {
      this.insert(sprite.body);
    }
  }

  /**
   * Split the node into 4 subnodes
   */
  private split(): void {
    this.level++;

    //  top right node
    this.nodes[0] = new QuadTree(
      this.bounds.right,
      this.bounds.y,
      this.bounds.subWidth,
      this.bounds.subHeight,
      this.maxObjects,
      this.maxLevels,
      this.level
    );

    //  top left node
    this.nodes[1] = new QuadTree(
      this.bounds.x,
      this.bounds.y,
      this.bounds.subWidth,
      this.bounds.subHeight,
      this.maxObjects,
      this.maxLevels,
      this.level
    );

    //  bottom left node
    this.nodes[2] = new QuadTree(
      this.bounds.x,
      this.bounds.bottom,
      this.bounds.subWidth,
      this.bounds.subHeight,
      this.maxObjects,
      this.maxLevels,
      this.level
    );

    //  bottom right node
    this.nodes[3] = new QuadTree(
      this.bounds.right,
      this.bounds.bottom,
      this.bounds.subWidth,
      this.bounds.subHeight,
      this.maxObjects,
      this.maxLevels,
      this.level
    );
  }

  /**
   * Insert the object into the node. If the node exceeds the capacity, it will split and add all objects to their corresponding subnodes.
   */
  public insert(obj: PositionedObject): void {
    let i = 0;
    let index: number;

    //  if we have subnodes ...
    if (this.nodes[0] != null) {
      index = this.getIndex(obj);

      if (index !== -1) {
        this.nodes[index].insert(obj);
        return;
      }
    }

    this.objects.push(obj);

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      //  Split if we don't already have subnodes
      if (this.nodes[0] == null) {
        this.split();
      }

      //  Add objects to subnodes
      while (i < this.objects.length) {
        index = this.getIndex(this.objects[i]);

        if (index !== -1) {
          //  this is expensive - see what we can do about it
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  /**
   * Determine which node the object belongs to.
   * @returns Index of the subnode (0-3), or -1 if rect cannot completely fit within a subnode and is part of the parent node.
   */
  private getIndex(rect: PositionedObject): number {
    //  default is that rect doesn't fit, i.e. it straddles the internal quadrants
    let index = -1;
    const midX = this.bounds.x + this.bounds.subWidth;
    const midY = this.bounds.y + this.bounds.subHeight;

    if (rect.x < midX && rect.right < midX) {
      if (rect.y < midY && rect.bottom < midY) {
        //  rect fits within the top-left quadrant of this quadtree
        index = 1;
      } else if (rect.y > midY) {
        //  rect fits within the bottom-left quadrant of this quadtree
        index = 2;
      }
    } else if (rect.x > midX) {
      //  rect can completely fit within the right quadrants
      if (rect.y < midY && rect.bottom < midY) {
        //  rect fits within the top-right quadrant of this quadtree
        index = 0;
      } else if (rect.y > midY) {
        //  rect fits within the bottom-right quadrant of this quadtree
        index = 3;
      }
    }

    return index;
  }

  /**
   * Return all objects that could collide with the given Sprite.
   */
  public retrieve(sprite: Sprite): PositionedObject[] {
    let returnObjects: PositionedObject[] = [];

    // Check if sprite's bounds intersect with this node's bounds
    if (!this.intersects(sprite.body)) {
      return returnObjects;
    }

    // Add objects in this node that intersect with the sprite
    for (const obj of this.objects) {
      if (this.intersects(obj, sprite.body)) {
        returnObjects.push(obj);
      }
    }

    if (this.nodes[0]) {
      // Check all subnodes
      returnObjects = returnObjects.concat(this.nodes[0].retrieve(sprite));
      returnObjects = returnObjects.concat(this.nodes[1].retrieve(sprite));
      returnObjects = returnObjects.concat(this.nodes[2].retrieve(sprite));
      returnObjects = returnObjects.concat(this.nodes[3].retrieve(sprite));
    }

    return returnObjects;
  }

  /**
   * Check if two rectangles intersect
   */
  private intersects(rect1: PositionedObject, rect2?: PositionedObject): boolean {
    if (!rect2) {
      rect2 = this.bounds;
    }
    return !(
      rect1.right < rect2.x ||
      rect1.x > rect2.right ||
      rect1.bottom < rect2.y ||
      rect1.y > rect2.bottom
    );
  }

  /**
   * Clear the quadtree.
   */
  public clear(): void {
    this.objects = [];

    for (let i = 0, len = this.nodes.length; i < len; i++) {
      if (this.nodes[i]) {
        this.nodes[i].clear();
        delete this.nodes[i];
      }
    }
  }
}
