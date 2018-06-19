# Dynamic Grid

## Installation

```
<script src="/path/todynamic-grid/dynamic-grid.js"></script>
```

## Usage

```
<div id="the-grid">
    <div class="block">...</div>
    <div class="block">...</div>
    <div class="block">...</div>
</div>

...

<script>
$('#the-grid').dynamicGrid();
</script>
```

To initialize with options:

```
<script>
$('#the-grid').dynamicGrid({
    blockSelector: '.block',
    animatedAtStart: true
});
</script>
```

## API

```
// Clear all filters and show all blocks
$('#the-grid').dyamicGrid('filter', '*');

// Show only the blocks with class 'red'
$('#the-grid').dyamicGrid('filter', '.red');

// Enable animations on future reflows
$('#the-grid').dyamicGrid('make animated', true);

// Disable animations on future reflows
$('#the-grid').dyamicGrid('make animated', false);

// Rearranges the blocks to fit inside the grid
// Usually you don't need to do this manually, because it is done automatically when the browser window resizes
$('#the-grid').dyamicGrid('reflow');

// Re-applies the filters to the grid, recollects the blocks inside the grid and performs a reflow
$('#the-grid').dyamicGrid('refresh');
```