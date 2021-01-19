import {ViewStyle} from "react-native";

export interface CubeNavigationHorizontalProps {
    loop?: boolean;
    expandView?: boolean;
    responderCaptureDx?: number;
    callBackAfterSwipe?: (targetXPosition: number, targetPage: number) => void;
    callbackOnSwipe?: (isScroll: boolean) => void;
    initialPage?: number;
    style?: ViewStyle;
}

export interface CubeNavigationHorizontalState {
    fullWidth: number;
    pagePositions: number[];
    currentPage: number;
}

export interface Location {
    x: number;
    y: number;
}
