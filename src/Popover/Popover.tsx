import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    useDismiss,
    useRole,
    useInteractions,
    useMergeRefs,
    Placement,
    useId,
    useFocus,
} from "@floating-ui/react";
import { ButtonHTMLAttributes, Dispatch, HTMLProps, ReactNode, SetStateAction, cloneElement, createContext, forwardRef, isValidElement, useContext, useLayoutEffect, useMemo, useState } from "react";

import Styles from "./Popover.module.scss";

interface PopoverOptions {
    initialOpen?: boolean;
    placement?: Placement;
    modal?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function usePopover({
    initialOpen = false,
    placement = "bottom-start",
    modal,
    open: controlledOpen,
    onOpenChange: setControlledOpen
}: PopoverOptions = {}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);
    const [labelId, setLabelId] = useState<string | undefined>();
    const [descriptionId, setDescriptionId] = useState<
        string | undefined
    >();

    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = setControlledOpen ?? setUncontrolledOpen;

    const data = useFloating({
        placement,
        open,
        onOpenChange: setOpen,
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(42),
            flip({
                crossAxis: placement.includes("-"),
                fallbackAxisSideDirection: "end",
                padding: 5
            }),
            shift({ padding: 5 })
        ]
    });

    const context = data.context;

    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context);

    const interactions = useInteractions([focus, dismiss, role]);

    return useMemo(
        () => ({
            open,
            setOpen,
            ...interactions,
            ...data,
            modal,
            labelId,
            descriptionId,
            setLabelId,
            setDescriptionId
        }),
        [open, setOpen, interactions, data, modal, labelId, descriptionId]
    );
}

type ContextType =
    | (ReturnType<typeof usePopover> & {
        setLabelId: Dispatch<SetStateAction<string | undefined>>;
        setDescriptionId: Dispatch<
            SetStateAction<string | undefined>
        >;
    })
    | null;

const PopoverContext = createContext<ContextType>(null);

export const usePopoverContext = () => {
    const context = useContext(PopoverContext);

    if (context == null) {
        throw new Error("Popover components must be wrapped in <Popover />");
    }

    return context;
};

export function Popover({
    children,
    modal = false,
    ...restOptions
}: {
    children: ReactNode;
} & PopoverOptions) {
    // This can accept any props as options, e.g. `placement`,
    // or other positioning options.
    const popover = usePopover({ modal, ...restOptions });
    return (
        <PopoverContext.Provider value={popover}>
            {children}
        </PopoverContext.Provider>
    );
}

interface PopoverTriggerProps {
    children: ReactNode;
    asChild?: boolean;
}

export const PopoverTrigger = forwardRef<
    HTMLElement,
    HTMLProps<HTMLElement> & PopoverTriggerProps
>(function PopoverTrigger({ children, asChild = false, ...props }, propRef) {
    const context = usePopoverContext();
    const childrenRef = (children as any).ref;
    const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

    // `asChild` allows the user to pass any element as the anchor
    if (asChild && isValidElement(children)) {
        return cloneElement(
            children,
            context.getReferenceProps({
                ref,
                ...props,
                ...children.props,
                "data-state": context.open ? "open" : "closed"
            })
        );
    }

    return (
        <div
            ref={ref}
            // The user can style the trigger based on the state
            data-state={context.open ? "open" : "closed"}
            {...context.getReferenceProps(props)}
        >
            {children}
        </div>
    );
});

export const PopoverContent = forwardRef<
    HTMLDivElement,
    HTMLProps<HTMLDivElement>
>(function PopoverContent({ style, ...props }, propRef) {
    const { context: floatingContext, ...context } = usePopoverContext();
    const ref = useMergeRefs([context.refs.setFloating, propRef]);

    if (!floatingContext.open) return null;

    return (
        <div
            ref={ref}
            style={{ ...context.floatingStyles, ...style }}
            aria-labelledby={context.labelId}
            aria-describedby={context.descriptionId}
            {...context.getFloatingProps(props)}
        >
            {props.children}
        </div>
    );
});

export const PopoverHeading = forwardRef<
    HTMLHeadingElement,
    HTMLProps<HTMLHeadingElement>
>(function PopoverHeading(props, ref) {
    const { setLabelId } = usePopoverContext();
    const id = useId();

    // Only sets `aria-labelledby` on the Popover root element
    // if this component is mounted inside it.
    useLayoutEffect(() => {
        setLabelId(id);
        return () => setLabelId(undefined);
    }, [id, setLabelId]);

    return (
        <h2 {...props} ref={ref} id={id}>
            {props.children}
        </h2>
    );
});

export const PopoverDescription = forwardRef<
    HTMLParagraphElement,
    HTMLProps<HTMLParagraphElement>
>(function PopoverDescription(props, ref) {
    const { setDescriptionId } = usePopoverContext();
    const id = useId();

    // Only sets `aria-describedby` on the Popover root element
    // if this component is mounted inside it.
    useLayoutEffect(() => {
        setDescriptionId(id);
        return () => setDescriptionId(undefined);
    }, [id, setDescriptionId]);

    return <div className={Styles.PopoverBase} {...props} ref={ref} id={id} />;
});

export const PopoverClose = forwardRef<
    HTMLButtonElement,
    ButtonHTMLAttributes<HTMLButtonElement>
>(function PopoverClose(props, ref) {
    const { setOpen } = usePopoverContext();
    return (
        <button
            type="button"
            ref={ref}
            {...props}
            onClick={(event) => {
                props.onClick?.(event);
                setOpen(false);
            }}
        />
    );
});
