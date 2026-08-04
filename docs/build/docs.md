# Commands

- [`:goto line-index`](#goto-line-index)
- [`:autofocus`](#autofocus)
- [`:focus`](#focus)
- [`:top`](#top)
- [`:sclr color`](#sclr-color)
- [`:sopa opacity`](#sopa-opacity)
- [`:size size`](#size-size)
- [`:bclr string-index color`](#bclr-string-index-color)
- [`:rclr range color`](#rclr-range-color)
- [`:pfg color`](#pfg-color)
- [`:pbg color`](#pbg-color)
- [`:ccp color-id`](#ccp-color-id)
- [`:reset`](#reset)
- [`:force-reset`](#force-reset)

# Descriptions

## goto line-index

>`:goto line-index`
>
> Sets the cursor at the given line
>
> Parameters:
> - line-index: unsigned int


## autofocus

>`:autofocus`
>
> Toggles autofocus when using goto or arrow keys
>


## focus

>`:focus`
>
> Scrolls the page towards the current cursor
>


## top

>`:top`
>
> Scrolls the page towards the top
>


## sclr color

>`:sclr color`
>
> Sets the select color
>
> Parameters:
> - color: a color in hexadecimal format, must include 6 characters | a character between a-z, case-insensitive


## sopa opacity

>`:sopa opacity`
>
> Sets the select opacity
>
> Parameters:
> - opacity: percentage


## size size

>`:size size`
>
> Sets the select size
>
> Parameters:
> - size: a length in pixels


## bclr string-index color

>`:bclr string-index color`
>
> Sets the color of one of the base string
>
> Parameters:
> - string-index: unsigned int
> - color: a color in hexadecimal format, must include 6 characters | a character between a-z, case-insensitive


## rclr range color

>`:rclr range color`
>
> Sets the color of multiple base strings between the specified range
>
> Parameters:
> - range: unsigned int range
> - color: a color in hexadecimal format, must include 6 characters | a character between a-z, case-insensitive


## pfg color

>`:pfg color`
>
> Sets the foreground color of the percentage bar
>
> Parameters:
> - color: a color in hexadecimal format, must include 6 characters | a character between a-z, case-insensitive


## pbg color

>`:pbg color`
>
> Sets the background color of the percentage bar
>
> Parameters:
> - color: a color in hexadecimal format, must include 6 characters | a character between a-z, case-insensitive


## ccp color-id

>`:ccp color-id`
>
> Copies one of the defined colors to clipboard
>
> Parameters:
> - color-id: a character between a-z, case-insensitive


## reset

>`:reset`
>
> Resets every setting related to the current pattern
>


## force-reset

>`:force-reset`
>
> Resets every setting related to the current pattern without the prompt
>

