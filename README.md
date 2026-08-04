# Bracelet Book eXtended

Bracelet Book eXtended (BBX) is en extension to add some much-needed functionality to [braceletbook](www.braceletbook.com).
BBX adds various functions like a row cursor to track your progress and colorful start strings for alphas!

## Features

- Progress tracker
- Line selector with custom color, size and opacity options
- Ability to color base strings in alpha patterns
- Ability to copy the color code of a string
- And more!

## Installation

BBX is currently under developement, and it aims to add functionality that feels missing. So it is a temporary solution, hence I don't plan on adding it to any of the extension marketplaces. 

### Firefox

#### Manually add the file

- Download the latest version from the releases tab
- Find the xpi file and drag it to Firefox
- Press add

#### Automatically install it

I host the latest version in my website. So you can [click this link to install BBX automatically](https://bbx.batujk.com/bbx-latest.xpi)

### Chrome

- Press the green code button at the top of the page
- Press `Dowload ZIP`
- Unzip it follow the instructions [here](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)


## FAQ

### How do I use BBX?

After installing BBX pressing `:` button should open a black box in the bottom right. That is your terminal which allows you to enter codes to do stuff. You can check out what you can do in the automatically docs.

Some examples are:

`goto <number>` If you have a big pattern, and you want to go to for example the 24th line you can use `goto 24`

`sopa <number>%` If the line selector is too transparent you can change it by typing `sopa 100%`

`rclr <range> <color>` Sometimes when an alpha pattern is big I use colorful base strings so it is easier to keep track. `rclr` and `bclr` can be used to color the pattern strings to your real life strings so it is easier to count. They also let you use pattern colors so you can do `rclr 0-3 #ffffff` or `rclr 0-3 A`, first one will color the first 3 strings white and the second one will color the first 3 strings whatever the A color for that pattern is.

There are a lot more comments. You can check the docs.

The settings are per pattern and they persist between sessions. So if you change something, close and open the pattern you will see your settings. If something goes wrong, or you want to set then to default use `reset`.

Also settings are stored on your device so if you use multiple devices the settings and progress won't be the same for each.

### Does BBX collect any data?

No. Not your progression not your settings. This means your data is safe with you, but it also means you can't have setting/progress sync between devices.

### Is BBX officially supported?

No.

### Is BBX free?

Yes. BBX started as something I made for myself, but then I realised many people also have the same problems as me, so I decided to publish it.