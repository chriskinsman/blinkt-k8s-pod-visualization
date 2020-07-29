# blinkt-k8s-pod-visualization

I frequently use my (picocluster)[https://www.picocluster.com/collections/pico-5/products/pico-5-raspberry-pi] to demonstrate  (kubernetes)[https://kubernetes.io/] or (rancher)[https://rancher.com/] to developers.  It is awesome to be able to visualize the scheduling of pods across nodes using the (Pimoroni Blinkt!)[https://www.picocluster.com/collections/accessories/products/blinkt-leds-for-picocluster] led light bars.  Who doesn't like blinking LEDs?

## Quick Start

Prerequisites:
* k8s installed on your pi cluster
* kubectl already connected to your pi cluster
* (helm 3)[https://helm.sh] installed


Install with:
```bash
helm install blinkt-k8s-pod-visualization . --set-file namespaces=../../namespaces.json --namespace blinkt
```

## Changing namespaces and colors

The (namespaces.json)[namespaces.json] file at the root controls which namespaces are shown on the LEDs and the color with which they are represented.  If you don't want kube-system pods represented remove that entry.  If you want another namespace not mentioned tracked add an entry for it.