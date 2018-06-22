import React, { Component } from 'react'
import {
  Alert,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableHighlight,
  TouchableOpacity,
  DeviceEventEmitter
} from 'react-native'
import NavigationBar from '../../common/NavigationBar'
import BackPressComponent from '../../common/BackPressComponent'
import SortableListView from 'react-native-sortable-listview'
import ViewUtils from '../../util/ViewUtils'
import ArrayUtils from '../../util/ArrayUtils'
import NavigatorUtil from '../../util/NavigatorUtil'
import LanguageDao, { FLAG_LANGUAGE } from '../../expand/dao/LanguageDao'
import { ACTION_HOME, FLAG_TAB } from '../HomePage'

export default class SortKeyPage extends Component {
  constructor (props) {
    super(props)
    this.backPress = new BackPressComponent({backPress: (e) => this.onBackPress(e)})

    this.params = this.props.navigation.state.params
    this.flag = this.params.flag
    this.theme = this.params.theme

    this.dataArray = []//原始数组
    this.originalCheckedArray = []//筛选后的数组
    this.sortResultArray = []//筛选后的数组应用到原始数组中
    this.state = {
      checkedArray: [],//筛选后数组排序
    }
  }

  componentDidMount () {
    this.backPress.componentDidMount()
    this.languageDao = new LanguageDao(this.params.flag)
    this.loadData()
  }

  componentWillUnmount () {
    this.backPress.componentWillUnmount()
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
    if (!ArrayUtils.isEqual(this.originalCheckedArray, this.state.checkedArray)) {
      Alert.alert(
        '提示',
        '是否要保存修改呢?',
        [
          {
            text: '否', onPress: () => {
              NavigatorUtil.goBack(this.props.navigation)
            }
          }, {
          text: '是', onPress: () => {
            this.onSave(true)
          }
        }
        ]
      )
    } else {
      NavigatorUtil.goBack(this.props.navigation)
    }

  }

  //加载本地存储的数据
  loadData () {
    this.languageDao.fetch()
      .then(result => {
        this.getCheckedItems(result)
      })
      .catch(err => {
        console.log(err)
      })
  }

  //保存
  onSave (isChecked) {
    if (!isChecked) {
      //判断是否相等，相等直接返回
      if (ArrayUtils.isEqual(this.originalCheckedArray, this.state.checkedArray)) {
        NavigatorUtil.goBack(this.props.navigation)
        return
      }
    }
    this.getSortResult()
    this.languageDao.save(this.sortResultArray)
    let jumpToTab = this.flag === FLAG_LANGUAGE.flag_key ? FLAG_TAB.flag_popularTab : FLAG_TAB.flag_trendingTab
    DeviceEventEmitter.emit('ACTION_HOME', ACTION_HOME.A_RESTART, jumpToTab)
  }

  //获取排序后的数组
  getSortResult () {
    this.sortResultArray = ArrayUtils.clone(this.dataArray)
    for (let i = 0, j = this.originalCheckedArray.length; i < j; i++) {
      let item = this.originalCheckedArray[i]
      let index = this.dataArray.indexOf(item)
      this.sortResultArray.splice(index, 1, this.state.checkedArray[i])
    }
  }

  //获取用户已订阅的标签
  getCheckedItems (result) {
    this.dataArray = result
    let checkedArray = []
    for (let i = 0, len = this.dataArray.length; i < len; i++) {
      let data = result[i]
      if (data.checked) {
        checkedArray.push(data)
      }
      this.setState({
        checkedArray: checkedArray
      })
      this.originalCheckedArray = ArrayUtils.clone(checkedArray)
    }
  }

  render () {
    let statusBar = {
      backgroundColor: this.theme.themeColor,
    }
    let title = this.flag === FLAG_LANGUAGE.flag_language ? '语言排序' : '标签排序'

    return (
      <View style={styles.container}>
        <NavigationBar
          title={title}
          statusBar={statusBar}
          style={this.theme.styles.navBar}
          leftButton={ViewUtils.getLeftButton(() => {
            this.onBack()
          })}
          rightButton={ViewUtils.getRightButton('保存', () => {
            this.onSave()
          })}
        />
        <SortableListView
          data={this.state.checkedArray}
          order={Object.keys(this.state.checkedArray)}
          onRowMoved={(e) => {
            this.state.checkedArray.splice(e.to, 0, this.state.checkedArray.splice(e.from, 1)[0])
            this.forceUpdate()
          }}
          renderRow={row => <SortCell data={row} theme={this.theme}/>}
        />
      </View>
    )
  }
}

class SortCell extends Component {
  render () {
    return (
      <TouchableHighlight
        underlayColor={'#eee'}
        style={this.props.data.checked ? styles.item : styles.hidden}
        {...this.props.sortHandlers}
      >
        <View style={styles.row}>
          <Image style={
            [{
              opacity: 1,
              width: 16,
              height: 16,
              marginRight: 10,
            }, this.props.theme.styles.tabBarSelectedIcon]}
            resizeMode='stretch'
            source={require('./images/ic_sort.png')}/>
          <Text>{this.props.data.name}</Text>
        </View>
      </TouchableHighlight>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5fcff'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  item: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  hidden: {
    height: 0
  },
})