import { Behavior, createBehavior } from '../src';

/**
 * Example Behavior: tracks window size reactively.
 * Demonstrates createBehavior() with onCreate args.
 */
class WindowSizeBehavior extends Behavior {
  width = window.innerWidth;
  height = window.innerHeight;
  breakpoint!: number;

  onCreate(breakpoint = 768) {
    this.breakpoint = breakpoint;
  }

  get isMobile() {
    return this.width < this.breakpoint;
  }

  // Class method → auto-bound as action (works with MobX strict mode)
  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  onMount() {
    window.addEventListener('resize', this.handleResize);
    return () => window.removeEventListener('resize', this.handleResize);
  }
}

export default createBehavior(WindowSizeBehavior);
