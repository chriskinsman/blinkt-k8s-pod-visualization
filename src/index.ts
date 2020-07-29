// Listens to k8s api for pod events happening on this node
import * as k8s from '@kubernetes/client-node';
const debug = require('debug')('blinkt-k8s-pod-visualization');
import { Blinkt, BASIC_COLOURS } from 'blinkt-kit';

const blinkt = new Blinkt({ clearOnExit: true });

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

interface Color {
    r: number;
    g: number;
    b: number;
}

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const default_brightness: number = 0.2;
const default_startColor: Color = BASIC_COLOURS.GREEN;
const default_stopColor: Color = BASIC_COLOURS.RED;

if (!process.env.NODE_NAME) {
    console.error('Must specify NODE_NAME as an environment variable');
    process.exit(1);
}

const nodeName: string = process.env.NODE_NAME;
const namespaceToColor = require('/etc/blinkt-k8s-pod-visualization/namespaces.json');

const podList: Array<k8s.V1Pod> = [];

function findPod(pod: k8s.V1Pod): number {
    let podIndex = -1;
    for (let i = 0; i < podList.length; i++) {
        if (podList[i].metadata?.name === pod.metadata?.name) {
            podIndex = i;
            break;
        }
    }

    return podIndex;
}

function addPod(pod: k8s.V1Pod, color: Color) {
    let podIndex = findPod(pod);

    if (podIndex == -1) {
        podList.push(pod);
        let numPods = podList.length;
        debug(`addPod name: ${pod.metadata?.name}, total pods: ${numPods}`);
        if (numPods < 9) {
            let newPixel = numPods - 1;
            blinkt.flashPixel({ pixel: newPixel, times: 2, intervalms: 500, ...default_startColor });
            blinkt.setPixel({ pixel: newPixel, brightness: default_brightness, ...color });
            blinkt.show();
        }
    }
    else {
        debug(`addPod already exists name: ${pod.metadata?.name}`);
    }
}

function deletePod(pod: k8s.V1Pod) {
    let podIndex = findPod(pod);
    if (podIndex === -1) {
        debug(`deletePod unable to find pod: ${pod.metadata?.name}`);
        return;
    }

    podList.splice(podIndex, 1);
    let endIndex = podList.length;
    debug(`deletePod name: ${pod.metadata?.name}, index: ${podIndex}, total pods: ${endIndex}`);
    if (podIndex < 8) {
        blinkt.flashPixel({ pixel: podIndex, times: 2, intervalms: 500, ...default_stopColor });
        if (endIndex > 8) {
            endIndex = 8;
        }
        else if (endIndex < 8) {
            for (let clearIndex = endIndex; clearIndex < 8; clearIndex++) {
                blinkt.setPixel({ pixel: clearIndex, r: 0, g: 0, b: 0 });
            }
        }

        for (let pixel = 0; pixel < endIndex; pixel++) {
            let podPixel = podList[pixel];
            if (podPixel?.metadata?.namespace && namespaceToColor[podPixel.metadata.namespace]) {
                blinkt.setPixel({ pixel, brightness: default_brightness, ...namespaceToColor[podPixel.metadata.namespace] });
            }
            else {
                debug(`Missing color mapping for namespace: ${podList[pixel].metadata?.namespace}`);
            }

        }
        blinkt.show();
    }
}

function podChange(action: string, pod: k8s.V1Pod) {

    if (pod.spec?.nodeName === nodeName && pod.metadata?.namespace && namespaceToColor[pod.metadata?.namespace]) {
        debug(`podChange action: ${action}`, pod);
        switch (action) {
            case 'add':
                addPod(pod, namespaceToColor[pod.metadata?.namespace]);
                break;

            case 'update':
                addPod(pod, namespaceToColor[pod.metadata?.namespace]);
                break;

            case 'delete':
                deletePod(pod);
                break;

            default:
                debug(`podChange no matching action: ${action}`);
                break;
        }
    }
    else {
        debug(`podChange skipping action: ${action}, pod: ${pod.metadata?.name}, node: ${pod.spec?.nodeName}, namespace: ${pod.metadata?.namespace}`);
    }


}

process.on('SIGTERM', () => {
    debug('SIGTERM received clearing all pixels');
    blinkt.showFinalAnimation(default_stopColor);
    blinkt.clear();
});

try {
    blinkt.showInitialAnimation(default_startColor);

    const listFn = () => k8sApi.listPodForAllNamespaces();
    const informer = k8s.makeInformer(kc, '/api/v1/pods', listFn);

    informer.on('add', (pod: k8s.V1Pod) => { podChange('add', pod); });
    informer.on('update', (pod: k8s.V1Pod) => { podChange('update', pod); });
    informer.on('delete', (pod: k8s.V1Pod) => { podChange('delete', pod); });
    informer.on('error', (err: k8s.V1Pod) => {
        console.error(err);
        // Restart informer after 5sec
        setTimeout(() => {
            debug('restarting informer');
            informer.start();
        }, 5000);
    });

    debug('Starting informer');
    informer.start();

}
catch (e) {
    console.error('Error shutting down', e);
}