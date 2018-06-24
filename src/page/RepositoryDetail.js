import React, { Component } from 'react'
import {
  Image,
  StyleSheet,
  WebView,
  TouchableOpacity,
  View
} from 'react-native'
import NavigationBar from '../common/NavigationBar'
import SafeAreaViewPlus from '../common/SafeAreaViewPlus'
import ViewUtils from '../util/ViewUtils'
import NavigatorUtil from '../util/NavigatorUtil'
import FavoriteDao from '../expand/dao/FavoriteDao'
import BackPressComponent from '../common/BackPressComponent'

const TRENDING_URL = 'https://github.com/'

export default class RepositoryDetail extends Component {
  constructor (props) {
    super(props)
    this.backPress = new BackPressComponent({backPress: (e) => this.onBackPress(e)})

    this.params = this.props.navigation.state.params
    let projectModel = this.params.projectModel
    let item = projectModel.item
    this.url = item.html_url ? item.html_url : TRENDING_URL + item.fullName
    let title = item.full_name ? item.full_name : item.fullName
    this.favoriteDao = new FavoriteDao(this.params.flag)
    console.log(projectModel.isFavorite)
    this.theme = this.params.theme
    this.state = {
      url: this.url,
      title: title,
      canGoBack: false,
      isFavorite: projectModel.isFavorite,
      favoriteIcon: projectModel.isFavorite ? require('../assets/images/ic_star.png') : require('../assets/images/ic_star_navbar.png'),
    }
  }

  componentDidMount () {
    this.backPress.componentDidMount()
  }

  componentWillUnmount () {
    this.backPress.componentWillUnmount()
    if (this.params.onUpdateFavorite) this.params.onUpdateFavorite()
  }

  /**
   * 处理安卓物理返回键
   * @param e
   * @returns {boolean}
   */
  onBackPress (e) {
    this.onBack()
    return true
  }

  //返回
  onBack () {
    if (this.state.canGoBack) {
      this.webView.goBack()
    } else {
      NavigatorUtil.goBack(this.props.navigation)
    }
  }

  onNavigationStateChange (e) {
    this.setState({
      canGoBack: e.canGoBack
    })
  }

  //设置favorite
  setFavoriteState (isFavorite) {
    this.setState({
      isFavorite: isFavorite,
      favoriteIcon: isFavorite ? require('../assets/images/ic_star.png') : require('../assets/images/ic_star_navbar.png'),
    })
  }

  //favoriteIcon单击回调函数
  onRightButtonClick () {
    let projectModel = this.params.projectModel
    this.setFavoriteState(projectModel.isFavorite = !projectModel.isFavorite)
    let key = projectModel.item.fullName ? projectModel.item.fullName : projectModel.item.id.toString()
    if (projectModel.isFavorite) {
      this.favoriteDao.saveFavoriteItem(key, JSON.stringify(projectModel.item))
    } else {
      this.favoriteDao.removeFavoriteItem(key)
    }
  }

  //右侧按钮
  renderRightButton () {
    return (
      <TouchableOpacity
        onPress={() => {
          this.onRightButtonClick()
        }}
      >
        <Image
          style={{width: 20, height: 20, marginRight: 10}}
          source={this.state.favoriteIcon}/>
      </TouchableOpacity>
    )
  }

  render () {
    let titleLayoutStyle = this.state.title.length > 20 ? {paddingRight: 30} : null
    let statusBar = {
      backgroundColor: this.theme.themeColor,
    }
    return (
      <SafeAreaViewPlus
        topColor={this.theme.themeColor}
      >
        <NavigationBar
          title={this.state.title}
          titleLayoutStyle={titleLayoutStyle}
          statusBar={statusBar}
          style={this.theme.styles.navBar}
          leftButton={ViewUtils.getLeftButton(() => {
            this.onBack()
          })}
          rightButton={this.renderRightButton()}
        />
        <WebView
          ref={webView => this.webView = webView}
          startInLoadingState={true}
          onNavigationStateChange={(e) => {
            this.onNavigationStateChange(e)
          }}
          source={{uri: this.state.url}}
        />
      </SafeAreaViewPlus>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  }
})