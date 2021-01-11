import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Animated,
    Dimensions,
    PanResponder, PanResponderGestureState,
    PanResponderInstance,
    Platform
} from 'react-native';
import {
    getAnimatedSlideViewStyles,
    getExpandedChildViewStyles,
    getNormalChildViewStyles,
    rootAnimatedViewStyles
} from "./Horizontal.Styles";

const {width: windowWidth, height: windowHeight} = Dimensions.get('window');

const PESPECTIVE = Platform.OS === 'ios' ? 2.38 : 1.7;
const TR_POSITION = Platform.OS === 'ios' ? 2 : 1.5;

export interface CubeNavigationHorizontalProps {
    loop?: boolean;
    scrollLockPage?: number;
    expandView?: boolean;
    responderCaptureDx?: number;
    callBackAfterSwipe?: (targetXPosition: number, targetPage: number) => void;
    callbackOnSwipe?: (isCompleted: boolean) => void;
}

interface Location {
    x: number;
    y: number;
}

export default memo<CubeNavigationHorizontalProps>((props) => {
    const {
        children,
        callBackAfterSwipe,
        callbackOnSwipe,
        expandView,
        loop,
        responderCaptureDx,
        scrollLockPage
    } = props;

    // Memos
    const fullWidth = useMemo<number>(() => {
        if (!Array.isArray(children)) {
            return windowWidth;
        }

        return (children.length - 1) * windowWidth;
    }, [children]);
    const pagePositions = useMemo<number[]>(() => {
        if (!Array.isArray(children)) {
            return [0];
        }

        return children.map<number>((child, index) => windowWidth * -index);
    }, [children]);

    // Memoized computed units
    const computedScrollLockPage = useMemo(() => {
        if( typeof scrollLockPage === 'number' ) {
            return scrollLockPage;
        }

        return 0;
    }, [scrollLockPage]);
    const computedResponderCaptureDx = useMemo(() => {
        if( typeof responderCaptureDx === 'number' ) {
            return responderCaptureDx;
        }

        return 60;
    }, [responderCaptureDx]);
    const computedExpandView = useMemo(() => {
        if( typeof expandView === 'boolean' ) {
            return expandView;
        }

        return false;
    }, [expandView]);
    const computedLoop = useMemo(() => {
        if( typeof loop === 'boolean' ) {
            return loop;
        }

        return false;
    }, [loop]);

    // States
    const [currentPage, setCurrentPage] = useState(0);
    const [, setScrollLockPageState] = useState(pagePositions[computedScrollLockPage]);
    const [_value, setValue] = useState<Location>({x: 0, y: 0});

    // Computed Styles
    const computedNormalChildViewStyles = useMemo(() => getNormalChildViewStyles(windowWidth, windowHeight), []);
    const computedExpandedChildViewStyles = useMemo(() => getExpandedChildViewStyles(windowWidth, windowHeight), []);
    const computedExpandStyles = useMemo(() => computedExpandView ? getExpandedChildViewStyles(windowWidth, windowHeight, true) : getNormalChildViewStyles(windowWidth, windowHeight, true), [ computedExpandView ]);

    // Refs
    const _animatedValue = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
    const _scrollViewRef = useRef<typeof Animated.View>(null);
    const _panResponder = useRef<PanResponderInstance>(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
            return Math.abs(gestureState.dx) > computedResponderCaptureDx
        },
        onPanResponderGrant: () => {
            if (callbackOnSwipe) {
                callbackOnSwipe(true);
            }
            _animatedValue.stopAnimation();
            _animatedValue.setOffset({x: _value.x, y: _value.y});
        },
        onPanResponderMove: (e, gestureState) => {
            if (computedLoop) {
                if (gestureState.dx < 0 && _value.x < -1 * fullWidth) {
                    _animatedValue.setOffset({x: windowWidth, y: 0});
                } else if (gestureState.dx > 0 && _value.x > 0) {
                    _animatedValue.setOffset({x: -1 * (fullWidth + windowWidth), y: 0});
                }
            }
            Animated.event([null, {dx: _animatedValue.x}])(e, gestureState);
        },
        onPanResponderRelease: (e, gestureState) => {
            onDoneSwiping(gestureState);
        },
        onPanResponderTerminate: (e, gestureState) => {
            onDoneSwiping(gestureState);
        },
    }));

    // Cached style functions
    const computeAnimatedSlideViewStyles = useCallback((additionalTransforms: Animated.AnimatedInterpolation) => getAnimatedSlideViewStyles(additionalTransforms), []);

    // Cached functions
    const findClosest = useCallback((horizontalPos: number) => {
        let minDiff = 1000;
        let selectedPage = 0;

        for (let index in pagePositions) {
            let currentDifference = Math.abs(horizontalPos - pagePositions[index]);

            if (currentDifference < minDiff) {
                minDiff = currentDifference;
                selectedPage = parseInt(index);
            }
        }

        return selectedPage;
    }, [pagePositions]);
    const onDoneSwiping = useCallback((gestureState: PanResponderGestureState) => {
        if (callbackOnSwipe) {
            callbackOnSwipe(false);
        }

        const mod = gestureState.dx > 0 ? 100 : -100;

        const closestPage = findClosest((_animatedValue.x as any) + mod);

        let goTo = pagePositions[closestPage];

        _animatedValue.flattenOffset();

        Animated.spring(_animatedValue, {
            toValue: {x: goTo, y: 0},
            friction: 3,
            tension: 0.6,
            useNativeDriver: false
        }).start();

        setTimeout(() => {
            setCurrentPage(closestPage);
            if (callBackAfterSwipe) {
                callBackAfterSwipe(goTo, Math.abs(goTo / windowWidth));
            }
        }, 500);
    }, [callbackOnSwipe, callBackAfterSwipe, pagePositions]);
    const scrollTo = useCallback((page: number, animated: boolean) => {
        const shouldBeAnimated = animated == undefined ? true : animated;

        if (shouldBeAnimated) {
            Animated.spring(_animatedValue, {
                toValue: {x: pagePositions[page], y: 0},
                friction: 4,
                tension: 0.8,
                useNativeDriver: false
            }).start();
        } else {
            _animatedValue.setValue({x: pagePositions[page], y: 0});
        }

        setCurrentPage(page);
    }, [pagePositions]);
    const _getTransformsFor = useCallback((index: number) => {
        let scrollX = _animatedValue.x;
        let pageX = -1 * windowWidth * index;
        let loopVariable: any = (variable: number, sign = 1) => variable + Math.sign(sign) * (fullWidth + windowWidth);

        let padInput = (variables: any[]) => {
            if (!computedLoop) {
                return variables;
            }

            const returnedVariables = [...variables];
            returnedVariables.unshift(...variables.map(variable => loopVariable(variable, -1)))
            returnedVariables.push(...variables.map(variable => loopVariable(variable, 1)))
            return returnedVariables;
        }
        let padOutput = (variables: any[]) => {
            if (!computedLoop) {
                return variables;
            }

            const returnedVariables = [...variables];
            returnedVariables.unshift(...variables)
            returnedVariables.push(...variables)
            return returnedVariables;
        }

        let translateX = scrollX.interpolate({
            inputRange: padInput([pageX - windowWidth, pageX, pageX + windowWidth]),
            outputRange: padOutput([(-1 * windowWidth - 1) / TR_POSITION, 0, (windowWidth + 1) / TR_POSITION]),
            extrapolate: 'clamp'
        });

        let rotateY = scrollX.interpolate({
            inputRange: padInput([pageX - windowWidth, pageX, pageX + windowWidth]),
            outputRange: padOutput(['-60deg', '0deg', '60deg']),
            extrapolate: 'clamp'
        });

        let translateXAfterRotate = scrollX.interpolate({
            inputRange: padInput([
                pageX - windowWidth,
                pageX - windowWidth + 0.1,
                pageX,
                pageX + windowWidth - 0.1,
                pageX + windowWidth
            ]),
            outputRange: padOutput([
                -1 * windowWidth - 1,
                (-1 * windowWidth - 1) / PESPECTIVE,
                0,
                (windowWidth + 1) / PESPECTIVE,
                +windowWidth + 1
            ]),
            extrapolate: 'clamp'
        });

        let opacity = scrollX.interpolate({
            inputRange: padInput([
                pageX - windowWidth,
                pageX - windowWidth + 10,
                pageX,
                pageX + windowWidth - 250,
                pageX + windowWidth
            ]),
            outputRange: padOutput([0, 0.6, 1, 0.6, 0]),
            extrapolate: 'clamp'
        });

        return {
            transform: [
                {perspective: windowWidth},
                {translateX},
                {rotateY: rotateY},
                {translateX: translateXAfterRotate}
            ],
            opacity: opacity
        };
    }, [fullWidth, computedLoop]);
    const valueSetter = useCallback((value: Location) => {
        setValue(value)
    }, []);

    // Effects
    useEffect(() => {
        const instanceId = _animatedValue.addListener(valueSetter);

        return () => {
            _animatedValue.removeListener(instanceId);
        };
    }, []);
    useEffect(() => {
        setScrollLockPageState(pagePositions[computedScrollLockPage]);
    }, [computedScrollLockPage]);


    // Renderers
    const renderChildren = useMemo(() => {
        if (!Array.isArray(children)) {
            return null;
        }

        return children.map((childItem, index) => {
            let expandStyle = computedExpandView ? computedExpandedChildViewStyles : computedNormalChildViewStyles;
            let style = [(childItem as JSX.Element).props.style, expandStyle];
            let childProps: any = { i: index, style };
            let element = React.cloneElement(childProps, props);
            const transforms: any = _getTransformsFor(index);

            return (
                <Animated.View
                    style={computeAnimatedSlideViewStyles(transforms)}
                    key={`childSlide- ${index}`}
                    pointerEvents={currentPage === index ? 'auto' : 'none'}
                >
                    {element}
                </Animated.View>
            );
        });
    }, [children, computedExpandView, currentPage, computedExpandedChildViewStyles, computedNormalChildViewStyles]);

    return (
        <Animated.View style={rootAnimatedViewStyles} ref={_scrollViewRef} {..._panResponder.current.panHandlers}>
            <Animated.View style={computedExpandStyles}>
                {renderChildren}
            </Animated.View>
        </Animated.View>
    );
});
