import React, {PureComponent, RefObject} from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    PanResponder,
    PanResponderGestureState,
    PanResponderInstance,
    Platform,
    ViewStyle
} from 'react-native';
import {
    getAnimatedSlideViewStyles,
    getExpandedChildViewStyles,
    getNormalChildViewStyles, getRootAnimatedViewStyles
} from "./Horizontal.Styles";
import {Location, CubeNavigationHorizontalProps, CubeNavigationHorizontalState} from "./Horizontal.Types";

const {width: windowWidth, height: windowHeight} = Dimensions.get('window');

const PERSPECTIVE = Platform.OS === 'ios' ? 2.38 : 2.16;
const TR_POSITION = Platform.OS === 'ios' ? 2 : 1.4;

export default class CubeNavigationHorizontal extends PureComponent<CubeNavigationHorizontalProps, CubeNavigationHorizontalState> {
    static defaultProps: CubeNavigationHorizontalProps = {
        loop: false,
        expandView: false,
        responderCaptureDx: 60
    };

    animatedListenerId: string | null;
    accessibleAnimatedValue: Location;
    _scrollViewRef: RefObject<typeof Animated.View> | null;
    _panResponder: PanResponderInstance;
    _animatedValue: Animated.ValueXY;

    constructor(props: CubeNavigationHorizontalProps) {
        super(props);

        const {
            responderCaptureDx,
            loop,
            callbackOnSwipe,
            initialPage
        } = this.props;

        this.accessibleAnimatedValue = {x: 0, y: 0};
        this.animatedListenerId = null;
        this._animatedValue = new Animated.ValueXY();
        this._scrollViewRef = null;

        this._panResponder = PanResponder.create({
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
                return Math.abs(gestureState.dx) > responderCaptureDx!
            },
            onPanResponderGrant: () => {
                if (callbackOnSwipe) {
                    callbackOnSwipe(true);
                }
                this._animatedValue.stopAnimation();
                this._animatedValue.setOffset({x: this.accessibleAnimatedValue.x, y: this.accessibleAnimatedValue.y});
            },
            onPanResponderMove: (e, gestureState) => {
                if (loop) {
                    if (gestureState.dx < 0 && this.accessibleAnimatedValue.x < -1 * this.state.fullWidth) {
                        this._animatedValue.setOffset({x: windowWidth, y: 0});
                    } else if (gestureState.dx > 0 && this.accessibleAnimatedValue.x > 0) {
                        this._animatedValue.setOffset({x: -1 * (this.state.fullWidth + windowWidth), y: 0});
                    }
                }
                Animated.event([null, {dx: this._animatedValue.x}], {
                    useNativeDriver: false
                })(e, gestureState);
            },
            onPanResponderRelease: (e, gestureState) => {
                this.onDoneSwiping(gestureState);
            },
            onPanResponderTerminate: (e, gestureState) => {
                this.onDoneSwiping(gestureState);
            },
        });

        this.state = {
            fullWidth: this.fullWidth(),
            pagePositions: this.pagePositions(),
            currentPage: initialPage ?? 0
        };

        const {pagePositions, currentPage} = this.state;
        this._animatedValue.setValue({ x: pagePositions[currentPage], y: 0 });
        this.accessibleAnimatedValue = { x: pagePositions[this.state.currentPage], y: 0 };

        this.setAccessibleAnimatedValue = this.setAccessibleAnimatedValue.bind(this);
        this.findClosest = this.findClosest.bind(this);
        this.renderChildren = this.renderChildren.bind(this);
    }

    fullWidth(): number {
        const {children} = this.props;

        if (!Array.isArray(children)) {
            return windowWidth;
        }

        return (children.length - 1) * windowWidth;
    }

    pagePositions(): number[] {
        const {children} = this.props;

        if (!Array.isArray(children)) {
            return [0];
        }

        return children.map<number>((child, index) => windowWidth * (-1 * index));
    }

    getComputedNormalChildViewStyles(): ViewStyle {
        return getNormalChildViewStyles(windowWidth, windowHeight);
    }

    getComputedExpandedChildViewStyles(): ViewStyle {
        return getExpandedChildViewStyles(windowWidth, windowHeight);
    }

    getComputedExpandStyles(): ViewStyle {
        if (this.props.expandView) {
            return getExpandedChildViewStyles(windowWidth, windowHeight, true);
        }

        return getNormalChildViewStyles(windowWidth, windowHeight, true);
    }

    setAccessibleAnimatedValue(value: Location) {
        this.accessibleAnimatedValue = value;
    }

    computeAnimatedSlideViewStyles(additionalTransforms: Animated.AnimatedInterpolation): ViewStyle {
        return getAnimatedSlideViewStyles(additionalTransforms);
    }

    findClosest(horizontalPos: number) {
        const array = this.state.pagePositions;
        let minDiff = 1000;
        let selectedPage = 0;

        for (let index = 0; index < array.length; index++) {
            const currentDifference = Math.abs(horizontalPos - array[index]);

            if (currentDifference < minDiff) {
                minDiff = currentDifference;
                selectedPage = index;
            }
        }

        return selectedPage;
    }

    onDoneSwiping(gestureState: PanResponderGestureState) {
        const {callbackOnSwipe, callBackAfterSwipe} = this.props;
        const {pagePositions} = this.state;

        if (callbackOnSwipe) {
            callbackOnSwipe(false);
        }

        const mod = gestureState.dx > 0 ? 100 : -100;

        const closestPage = this.findClosest(this.accessibleAnimatedValue.x + mod);

        let goTo = pagePositions[closestPage];

        this._animatedValue.flattenOffset();

        Animated.timing(this._animatedValue, {
            toValue: {x: goTo, y: 0},
            useNativeDriver: false,
            duration: 250,
            easing: Easing.cubic
        }).start(() => {
            this.setState({
                currentPage: closestPage
            });

            if (callBackAfterSwipe) {
                callBackAfterSwipe(goTo, Math.abs(goTo / windowWidth));
            }
        });
    }

    scrollTo(page: number, animated: boolean) {
        const {pagePositions} = this.state;

        const shouldBeAnimated = animated == undefined ? true : animated;

        if (shouldBeAnimated) {
            Animated.timing(this._animatedValue, {
                toValue: {x: pagePositions[page], y: 0},
                useNativeDriver: false,
                easing: Easing.cubic,
                duration: 250
            }).start(() => {
                this.setState({
                    currentPage: page
                })
            });
        } else {
            this._animatedValue.setValue({x: pagePositions[page], y: 0});

            this.setState({
                currentPage: page
            })
        }
    }

    _getTransformsFor(index: number) {
        const {loop} = this.props;
        const {fullWidth} = this.state;

        let scrollX = this._animatedValue.x;
        let pageX = -1 * windowWidth * index;
        let loopVariable: any = (variable: number, sign = 1) => variable + Math.sign(sign) * (fullWidth + windowWidth);

        let padInput = (variables: any[]) => {
            if (!loop) {
                return variables;
            }

            const returnedVariables = [...variables];
            returnedVariables.unshift(...variables.map(variable => loopVariable(variable, -1)))
            returnedVariables.push(...variables.map(variable => loopVariable(variable, 1)))
            return returnedVariables;
        }
        let padOutput = (variables: any[]) => {
            if (!loop) {
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
                (-1 * windowWidth - 1) / PERSPECTIVE,
                0,
                (windowWidth + 1) / PERSPECTIVE,
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
            outputRange: padOutput([0, 0.75, 1, 0.75, 0]),
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
    }

    componentDidMount() {
        this.animatedListenerId = this._animatedValue.addListener(this.setAccessibleAnimatedValue);
    }

    componentWillUnmount() {
        if( this.animatedListenerId !== null ) {
            this._animatedValue.removeListener(this.animatedListenerId);
        }
    }

    renderChildren() {
        const {children, expandView} = this.props;
        const {currentPage} = this.state;

        if (!Array.isArray(children)) {
            return null;
        }

        return children.map((childItem, index) => {
            if( typeof childItem === 'undefined' || childItem === null ) {
                return null;
            }

            let expandStyle = expandView ? this.getComputedExpandedChildViewStyles() : this.getComputedNormalChildViewStyles();
            let style = [(childItem as JSX.Element).props.style, expandStyle];
            let childProps: any = { i: index, style };
            let element = React.cloneElement(childItem as any, childProps);
            const transforms: any = this._getTransformsFor(index);

            return (
                <Animated.View
                    style={this.computeAnimatedSlideViewStyles(transforms)}
                    key={`childSlide- ${index}`}
                    pointerEvents={currentPage === index ? 'auto' : 'none'}
                >
                    {element}
                </Animated.View>
            );
        });
    }

    render() {
        const rootAnimatedViewStyles = getRootAnimatedViewStyles(this.props.style);

        return (
            <Animated.View style={rootAnimatedViewStyles} ref={this._scrollViewRef} {...this._panResponder.panHandlers}>
                <Animated.View style={this.getComputedExpandStyles()}>
                    {this.renderChildren()}
                </Animated.View>
            </Animated.View>
        );
    }
}
