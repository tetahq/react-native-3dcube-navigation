import {Animated, StyleSheet, ViewStyle} from "react-native";

export const rootAnimatedViewStyles: ViewStyle = {
    position: 'absolute'
}

export const getExpandedChildViewStyles = (windowWidth: number, windowHeight: number, addBaseStyles: boolean = false): ViewStyle => {
    let styles: ViewStyle = {
        paddingTop: 100,
        paddingBottom: 100,
        height: windowHeight + 200
    };

    if( addBaseStyles ) {
        styles.backgroundColor = '#000';
        styles.position = 'absolute';
        styles.width = windowWidth;
    }

    return styles;
}

export const getNormalChildViewStyles = (windowWidth: number, windowHeight: number, addBaseStyles: boolean = false): ViewStyle => {
    let styles: ViewStyle = {
        width: windowWidth,
        height: windowHeight
    };

    if( addBaseStyles ) {
        styles.backgroundColor = '#000';
        styles.position = 'absolute';
    }

    return styles;
}

export const getAnimatedSlideViewStyles = (additionalTransforms: Animated.AnimatedInterpolation): ViewStyle => {
    return {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        ...additionalTransforms
    }
}
