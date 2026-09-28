import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Set by `<Table stacked>` so rows can re-layout themselves as cards below `md`.
 * Wide CRM tables are unreadable on a phone even with horizontal scrolling, so
 * each row collapses into a stack of label/value pairs instead.
 */
const StackedContext = React.createContext(false)

function Table({
  className,
  stacked = false,
  ...props
}: React.ComponentProps<"table"> & { stacked?: boolean }) {
  return (
    <StackedContext.Provider value={stacked}>
      <div
        data-slot="table-container"
        className={cn(
          "relative w-full",
          // Stacked rows already fit the viewport, so only scroll once the real
          // table comes back at `md`.
          stacked ? "md:overflow-x-auto" : "overflow-x-auto"
        )}
      >
        <table
          data-slot="table"
          data-stacked={stacked || undefined}
          className={cn(
            "w-full caption-bottom text-sm",
            stacked && "max-md:block",
            className
          )}
          {...props}
        />
      </div>
    </StackedContext.Provider>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  const stacked = React.useContext(StackedContext)

  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", stacked && "max-md:hidden", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  const stacked = React.useContext(StackedContext)

  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "[&_tr:last-child]:border-0",
        stacked && "max-md:block",
        className
      )}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  const stacked = React.useContext(StackedContext)

  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        stacked && "max-md:block max-md:py-2",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * `label` is the column name this cell belongs to. In a `<Table stacked>` it is
 * shown beside the value once the header row is hidden on small screens. Leave
 * it off for the row's primary cell and for action cells, which read better as
 * full-width blocks.
 */
function TableCell({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<"td"> & { label?: string }) {
  const stacked = React.useContext(StackedContext)
  const labelled = stacked && label !== undefined

  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        stacked && "max-md:whitespace-normal",
        labelled
          ? "max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-3 max-md:px-3 max-md:py-1"
          : stacked && "max-md:block max-md:px-3",
        className
      )}
      {...props}
    >
      {labelled && (
        <span className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase md:hidden">
          {label}
        </span>
      )}
      {labelled ? (
        <span className="flex min-w-0 flex-col items-end gap-1 break-words text-right md:contents">
          {children}
        </span>
      ) : (
        children
      )}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
