# Performance Lab

Stage 28 defines a platform-independent performance measurement boundary.

## Measurements

The lab accepts normalized samples for CPU, GPU, audio, frame, memory and custom metrics. Benchmarks declare an id, version and target and return samples without depending on a UI or target runtime.

The lab stores samples, calculates min/max/average summaries and allows sample data to be cleared independently of benchmark registration.

## Boundary

Performance Lab does not choose a rendering engine, emulate hardware, modify production timing, or provide Web/Android-specific profiling APIs. Target-specific measurement adapters remain outside this layer.

The lab is diagnostic infrastructure, not a portal economy or marketplace mechanism.
