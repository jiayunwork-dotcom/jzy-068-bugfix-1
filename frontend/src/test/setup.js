// jsdom does not implement ResizeObserver; the grid uses it to track the
// viewport size. A no-op stand-in is enough for rendering tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || ResizeObserverStub
